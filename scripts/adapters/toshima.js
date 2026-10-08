// 豊島区議会. The year page links 「令和8年第2回豊島区議会定例会[会議結果]」, posted after the session closes. Its
// 議決結果 lists bills by proposer (h3 「議案等（区長提案）9件」, 「議案等（議員提案）2件」) and by outcome (a bold
// line 「原案可決 7件」, 「否決 1件」, 「閉会中の継続審査 2件」), one bill per line: 「第32号議案 title」. No bill
// texts, committees or vote dates are published, so bills are title-only.

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
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t).replace('豊島区議会', '') === key(`${session.name}[会議結果]`));
	if (!link) return { bills, warnings: [`${session.name} is not on ${index.url} yet (results appear after it closes)`] };
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);

	/** @type {'head' | 'member' | null} */
	let group = null;
	let result = '';
	for (const el of $('h2, h3, p').toArray()) {
		const text = key($(el).text());
		if (el.tagName !== 'p') {
			group = /^議案等\(区長提案\)/.test(text) ? 'head' : /^議案等\(議員提案\)/.test(text) ? 'member' : null;
			continue;
		}
		if (!group) continue;
		if ($(el).find('strong').length && !/第\d+号/.test(text)) {
			result = text.replace(/\d+件$|なし$/, '');
			continue;
		}
		const m = squash($(el).text()).match(/^(\S*第\S+?号(?:議案)?)\s+(.+)$/);
		const num = m ? parseBillNumber(m[1]) : null;
		if (!m || !num || !inScope(m[2])) continue;
		if (num.by === 'committee') {
			warnings.push(`${num.label} (committee bill) skipped: not supported yet`);
			continue;
		}
		const by = num.by;
		const out = outcome(/継続/.test(result) ? '継続審査' : result, null, null, null, { committeeUnknown: true });
		if (!out) {
			warnings.push(`${num.label}: unrecognised result 「${result}」, skipped`);
			continue;
		}
		bills.push({
			facts: {
				id: billId(assembly.id, s, num.n, by),
				assembly: assembly.id,
				number: num.label,
				official: m[2],
				by,
				session: session.name,
				committee: null,
				...out,
				titleOnly: true,
				sources: [{ label: `${session.name} 会議結果`, url: page.url, fetchedAt: page.fetchedAt }]
			},
			input: ''
		});
	}
	return { bills, warnings };
}
