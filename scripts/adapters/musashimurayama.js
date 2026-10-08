// 武蔵村山市議会. One page, 「令和8年第3回定例会　議決結果」, is overwritten each session, so only the latest
// session can be collected and earlier ones have to be caught while they are up. It has a 会議名 | 開会月日 |
// 閉会月日 table and a table per proposer ((1)市長提出議案, (3)議員提出議案): 議案番号 (「第66号」) | 件名 | 議決月日 |
// 議決結果. No bill texts or committees are published, so bills are title-only.

import { billId, inScope, outcome } from '../lib/bills.js';
import { loadHtml } from '../lib/html.js';
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

	const page = await get(assembly.listPages[0].url);
	const $ = loadHtml(page.body, page.contentType);
	const shown = key($('h1').first().text());
	if (!shown.startsWith(key(session.name))) return { bills, warnings: [`${page.url} now shows 「${shown}」, not ${session.name}`] };

	for (const table of $('table').toArray()) {
		const by = { '(1)市長提出議案': 'head', '(3)議員提出議案': 'member' }[key($(table).find('caption').text())];
		if (!by) continue;
		for (const tr of $(table).find('tr').toArray().slice(1)) {
			const tds = $(tr).children('td, th').toArray().map((td) => squash($(td).text()));
			const m = key(tds[0] ?? '').match(/^第(\d+)号$/);
			if (!m || tds.length < 4 || !inScope(tds[1])) continue;
			const n = Number(m[1]);
			const label = by === 'member' ? `議員提出議案第${n}号` : `議案第${n}号`;
			const d = key(tds[2]).match(/^(\d+)月(\d+)日$/);
			const voteDate = d ? `${s.year}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}` : null;
			const out = outcome(tds[3], null, null, voteDate, { committeeUnknown: true });
			if (!out) {
				warnings.push(`${label}: unrecognised result 「${tds[3]}」, skipped`);
				continue;
			}
			bills.push({
				facts: {
					id: billId(assembly.id, s, n, /** @type {'head' | 'member'} */ (by)),
					assembly: assembly.id,
					number: label,
					official: tds[1],
					by: /** @type {'head' | 'member'} */ (by),
					session: session.name,
					committee: null,
					...out,
					titleOnly: true,
					sources: [{ label: `${session.name} 議決結果`, url: page.url, fetchedAt: page.fetchedAt }]
				},
				input: ''
			});
		}
	}
	return { bills, warnings };
}
