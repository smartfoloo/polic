// あきる野市議会. A year-long 定例会 meets several times (「令和8年第1回定例会6月定例会議」, 「…第1回臨時
// 会議」, 「令和8年第2回定例会開会会議」); bill numbers run through the year. The 会議開催状況 index links one
// page per meeting with a 日程 table and a bill table: 議案番号 (「市長提出 50」, 「議員提出8－2」) | 件名
// (bill PDF) | 採決日 (「6月18日」) | 結果. No committee is given per bill.

import { billId, inScope, outcome, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
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
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === key(session.name));
	if (!link) return { bills, warnings: [`${session.name} is not on ${index.url}`] };
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);
	const table = $('table')
		.toArray()
		.find((t) => key($(t).find('th').first().text()) === '議案番号');
	if (!table) return { bills, warnings: [`No bill table on ${page.url}`] };

	for (const tr of $(table).find('tr').toArray().slice(1)) {
		const tds = $(tr).children('td').toArray().map((td) => $(td));
		if (tds.length < 4) continue;
		const m = key(tds[0].text()).match(/^(市長|議員)提出(?:\d+[-－])?(\d+)$/);
		const official = squash(tds[1].text());
		if (!m || !inScope(official)) continue;
		const by = m[1] === '議員' ? 'member' : 'head';
		const n = Number(m[2]);
		const label = by === 'member' ? `議員提出議案第${n}号` : `議案第${n}号`;
		const day = key(tds[2].text()).match(/(\d+)月(\d+)日/);
		const voteDate = day ? `${s.year}-${day[1].padStart(2, '0')}-${day[2].padStart(2, '0')}` : null;
		const result = key(tds[3].text());

		const sources = [{ label: session.name, url: page.url, fetchedAt: page.fetchedAt }];
		let input = '';
		let submitted = null;
		const pdf = tds[1].find('a[href*=".pdf"]').attr('href');
		if (pdf) {
			const href = new URL(pdf, page.url).href;
			const res = await get(href);
			const text = await pdfText(res.body);
			submitted = submittedDate(text);
			input = `【議案本文】\n${text}\n`;
			sources.push({ label: `${label}（PDF）`, url: href, fetchedAt: res.fetchedAt });
		} else warnings.push(`${label}: no bill PDF found`);

		const out = outcome(result, null, submitted, voteDate);
		if (!out) {
			warnings.push(`${label}: unrecognised result 「${result}」, skipped`);
			continue;
		}
		bills.push({
			facts: { id: billId(assembly.id, s, n, by), assembly: assembly.id, number: label, official, by, session: session.name, committee: null, ...out, sources },
			input
		});
	}
	return { bills, warnings };
}
