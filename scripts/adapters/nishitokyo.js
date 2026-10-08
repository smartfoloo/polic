// 西東京市議会. The year page links 「日程・付議案件・結果（令和8年第1回定例会）」, whose 付議案件 table is 案件
// (「議案第13号」) | 件名 | 上程月日 (「2月26日」) | 付託委員会 (abbreviated: 「建設環境」) | 議決結果等. No vote dates
// or bill texts are published (member bills are linked as PDFs, mostly 意見書), so bills are title-only and
// dated by 上程.

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
		[link] = findLinks(loadHtml(year.body, year.contentType), year.url, (t) => key(t) === key(`日程・付議案件・結果（${session.name}）`));
		if (link) break;
	}
	if (!link) return { bills, warnings: [`${session.name} is not on any of the listed year pages yet`] };
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);

	for (const table of $('table').toArray()) {
		const rows = $(table).find('tr').toArray();
		const headers = $(rows[0]).children().toArray().map((c) => key($(c).text()));
		const [cNum, cTitle, cDay, cCommittee, cResult] = ['案件', '件名', '上程月日', '付託委員会', '議決結果等'].map((h) => headers.indexOf(h));
		if (cNum < 0 || cTitle < 0 || cResult < 0) continue;

		for (const tr of rows.slice(1)) {
			const tds = $(tr).children('td, th').toArray().map((td) => squash($(td).text()));
			if (tds.length !== headers.length) continue;
			const num = parseBillNumber(tds[cNum]);
			if (!num || !inScope(tds[cTitle])) continue;
			if (num.by === 'committee') {
				warnings.push(`${num.label} (committee bill) skipped: not supported yet`);
				continue;
			}
			const d = cDay >= 0 ? key(tds[cDay]).match(/^(\d+)月(\d+)日$/) : null;
			const submitted = d ? `${s.year}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}` : null;
			const abbr = cCommittee >= 0 ? key(tds[cCommittee]) : '';
			const committee = !abbr || /^[-－―]|省略|即決/.test(abbr) ? null : abbr.endsWith('委員会') ? abbr : `${abbr}委員会`;
			const result = key(tds[cResult]).replace(/^[-－―]$/, '');
			const out = outcome(result, committee, submitted);
			if (!out) {
				warnings.push(`${num.label}: unrecognised result 「${tds[cResult]}」, skipped`);
				continue;
			}
			bills.push({
				facts: {
					id: billId(assembly.id, s, num.n, num.by),
					assembly: assembly.id,
					number: num.label,
					official: tds[cTitle],
					by: num.by,
					session: session.name,
					committee,
					...out,
					titleOnly: true,
					sources: [{ label: `${session.name} 日程・付議案件・結果`, url: page.url, fetchedAt: page.fetchedAt }]
				},
				input: ''
			});
		}
	}
	return { bills, warnings };
}
