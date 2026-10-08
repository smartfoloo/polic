// 日野市議会. The 議案等審議一覧表 index links 「令和8年第1回定例会　議案等審議結果一覧表」, one table per session:
// 議案番号 | 議案名 | the vote of each 会派 | 議決結果 | 議決年月日 (「令和8年3月30日」), added to day by day while the
// session runs. No bill texts or committees are published, so bills are title-only.

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
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === key(`${session.name}議案等審議結果一覧表`));
	if (!link) return { bills, warnings: [`${session.name} is not on ${index.url} yet`] };
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);

	for (const table of $('table').toArray()) {
		const rows = $(table).find('tr').toArray();
		const headers = $(rows[0]).children().toArray().map((c) => key($(c).text()));
		const [cNum, cTitle, cResult, cDate] = ['議案番号', '議案名', '議決結果', '議決年月日'].map((h) => headers.indexOf(h));
		if (cNum < 0 || cTitle < 0 || cResult < 0) continue;

		for (const tr of rows.slice(1)) {
			const tds = $(tr).children('td, th').toArray().map((td) => squash($(td).text()));
			if (tds.length !== headers.length) continue;
			const num = parseBillNumber(tds[cNum]);
			const official = tds[cTitle];
			if (!num || !inScope(official)) continue;
			if (num.by === 'committee') {
				warnings.push(`${num.label} (committee bill) skipped: not supported yet`);
				continue;
			}
			const out = outcome(`${tds[cResult]} ${cDate >= 0 ? tds[cDate] : ''}`, null, null, null, { committeeUnknown: true });
			if (!out) {
				warnings.push(`${num.label}: unrecognised result 「${tds[cResult]}」, skipped`);
				continue;
			}
			bills.push({
				facts: {
					id: billId(assembly.id, s, num.n, num.by),
					assembly: assembly.id,
					number: num.label,
					official,
					by: num.by,
					session: session.name,
					committee: null,
					...out,
					titleOnly: true,
					sources: [{ label: `${session.name} 議案等審議結果一覧表`, url: page.url, fetchedAt: page.fetchedAt }]
				},
				input: ''
			});
		}
	}
	return { bills, warnings };
}
