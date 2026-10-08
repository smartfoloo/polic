// 昭島市議会. The year page links 「【市議会】令和8年第2回定例会（6月15日から7月1日まで17日間）」, whose 議案等の
// 議決結果 table is 議案番号 | 件名 | 議決月日 (「7月1日」) | 議決結果. Committees appear only on a page for the
// session under way, and no bill texts are published, so bills are title-only with no committee.

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

	const index = await get(assembly.listPages[0].url);
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t).startsWith(key(`【市議会】${session.name}(`)));
	if (!link) return { bills, warnings: [`${session.name} is not on ${index.url}`] };
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);
	const table = $('table')
		.toArray()
		.find((t) => key($(t).find('tr').first().text()).startsWith('議案番号件名議決月日'));
	if (!table) return { bills, warnings: [`No 議決結果 table on ${page.url}`] };

	for (const tr of $(table).find('tr').toArray().slice(1)) {
		const tds = $(tr).children('td, th').toArray().map((td) => squash($(td).text()));
		if (tds.length < 4) continue;
		const num = parseBillNumber(tds[0]);
		if (!num || !inScope(tds[1])) continue;
		if (num.by === 'committee') {
			warnings.push(`${num.label} (committee bill) skipped: not supported yet`);
			continue;
		}
		const d = key(tds[2]).match(/^(\d+)月(\d+)日$/);
		const voteDate = d ? `${s.year}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}` : null;
		const out = outcome(tds[3], null, null, voteDate, { committeeUnknown: true });
		if (!out) {
			warnings.push(`${num.label}: unrecognised result 「${tds[3]}」, skipped`);
			continue;
		}
		bills.push({
			facts: {
				id: billId(assembly.id, s, num.n, num.by),
				assembly: assembly.id,
				number: num.label,
				official: tds[1],
				by: num.by,
				session: session.name,
				committee: null,
				...out,
				titleOnly: true,
				sources: [{ label: `${session.name} 議案等の議決結果`, url: page.url, fetchedAt: page.fetchedAt }]
			},
			input: ''
		});
	}
	return { bills, warnings };
}
