// 福生市議会. A year page links 「令和8年第2回定例会　審議結果」, which has an h2 per bill (「議案第21号　title」)
// followed by a list: 付託年月日・委員会 (「令和8年6月5日 市民厚生」 or なし), 議決年月日・結果 (「令和8年6月19日
// 原案可決」) and 内容, a one-paragraph summary. That paragraph is the only text published; there are no bill PDFs.

import { billId, inScope, outcome, parseBillNumber } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');

/**
 * @param {import('../../src/lib/config/assemblies.js').Assembly} assembly
 * @param {import('../../src/lib/config/assemblies.js').Session} session
 * @param {(url: string) => Promise<import('../lib/fetch.js').FetchResult>} get
 */
export async function collect(assembly, session, get) {
	/** @type {Collected[]} */
	const bills = [];
	/** @type {string[]} */
	const warnings = [];
	const s = parseSessionName(session.name);
	if (!s) return { bills, warnings: [`Unrecognised session name ${session.name}`] };

	let link = null;
	for (const { url } of assembly.listPages) {
		const year = await get(url);
		[link] = findLinks(loadHtml(year.body, year.contentType), year.url, (t) => key(t) === key(`${session.name}審議結果`));
		if (link) break;
	}
	if (!link) return { bills, warnings: [`${session.name} is not on any of the listed year pages`] };
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);

	for (const h2 of $('h2').toArray()) {
		const m = squash($(h2).text()).match(/^(\S+)\s+(.+)$/);
		const num = m ? parseBillNumber(m[1]) : null;
		if (!m || !num || !inScope(m[2])) continue;
		if (num.by === 'committee') {
			warnings.push(`${num.label} (committee bill) skipped: not supported yet`);
			continue;
		}
		/** @type {Record<string, string>} */
		const facts = {};
		const dl = $(h2).nextAll('dl').first();
		dl.find('dt').each((_, dt) => {
			facts[key($(dt).text())] = squash($(dt).next('dd').text());
		});
		const referral = facts['付託年月日・委員会'] ?? '';
		const abbr = key(referral.replace(/令和.{1,12}?日/, ''));
		const committee = !abbr || abbr === 'なし' ? null : abbr.endsWith('委員会') ? abbr : `${abbr}委員会`;
		const result = facts['議決年月日・結果'] ?? '';
		const content = facts['内容'] ?? '';

		const out = outcome(result, committee, null);
		if (!out) {
			warnings.push(`${num.label}: unrecognised result 「${result}」, skipped`);
			continue;
		}
		bills.push({
			facts: {
				id: billId(assembly.id, s, num.n, num.by),
				assembly: assembly.id,
				number: num.label,
				official: m[2],
				by: num.by,
				session: session.name,
				committee,
				...out,
				...(content ? {} : { titleOnly: true }),
				sources: [{ label: `${session.name} 審議結果`, url: page.url, fetchedAt: page.fetchedAt }]
			},
			input: content ? `【内容】\n${content}\n` : ''
		});
	}
	return { bills, warnings };
}
