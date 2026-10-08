// 秦野市議会. A year-long session meets as 「令和8年6月第2回定例月会議」 and 「令和8年7月第1回臨時会議」; bill
// numbers run through the year. The year page links one 「…の概要・結果」 page per meeting. It lists the bills
// (市長からの議案等, 議員からの議案: 議案等番号 | 件名 → PDF | 提出年月日), then follows the meeting day by day: each
// day is an h2 ending 【6月8日（月曜日）】, and each 本会議 table (議案等番号 | 件名 | 議決結果(等)) says where a
// bill went that day (「総務常任委員会付託」) or how it was decided (「原案可決」). 臨時会議 pages have no dated
// headings, so their bills have no vote date.

import { billId, inScope, outcome, parseBillNumber, stripFileNote } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseReiwaDate, parseSessionName, squash } from '../lib/text.js';

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
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === key(`${session.name}の概要・結果`));
	if (!link) return { bills, warnings: [`${session.name} is not on ${index.url}`] };
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);

	/** @type {Map<string, { num: NonNullable<ReturnType<typeof parseBillNumber>>, official: string, pdf: string | null, submitted: string | null }>} */
	const listed = new Map();
	/** @type {Map<string, { committee: string | null, result: string, voteDate: string | null }>} */
	const status = new Map();
	/** @type {string | null} */
	let day = null;

	for (const el of $('h2, table').toArray()) {
		if (el.tagName === 'h2') {
			const d = key($(el).text()).match(/【(\d+)月(\d+)日/);
			if (d) day = `${s.year}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}`;
			continue;
		}
		const rows = $(el).find('tr').toArray();
		const headers = $(rows[0]).children().toArray().map((c) => key($(c).text()));
		const cResult = headers.findIndex((h) => /^議決結果/.test(h));
		const cSubmitted = headers.indexOf('提出年月日');
		if (cResult < 0 && cSubmitted < 0) continue;

		for (const tr of rows.slice(1)) {
			const tds = $(tr).children('td, th').toArray().map((td) => $(td));
			if (tds.length < 3) continue;
			const num = parseBillNumber(tds[0].text());
			if (!num) continue;
			if (cSubmitted >= 0) {
				const pdf = tds[1].find('a[href$=".pdf"]').attr('href');
				listed.set(num.label, {
					num,
					official: stripFileNote(tds[1].text()),
					pdf: pdf ? new URL(pdf, page.url).href : null,
					submitted: parseReiwaDate(tds[cSubmitted].text())
				});
				continue;
			}
			const cell = key(tds[cResult].text());
			const prev = status.get(num.label) ?? { committee: null, result: '', voteDate: null };
			const referred = cell.match(/^(.+委員会)付託$/);
			if (referred) status.set(num.label, { ...prev, committee: referred[1] });
			else if (/可決|否決|継続/.test(cell)) status.set(num.label, { ...prev, result: cell, voteDate: /継続/.test(cell) ? null : day });
		}
	}
	if (!listed.size) return { bills, warnings: [`No bill list on ${page.url}`] };

	for (const { num, official, pdf, submitted } of listed.values()) {
		if (!inScope(official)) continue;
		if (num.by === 'committee') {
			warnings.push(`${num.label} (committee bill) skipped: not supported yet`);
			continue;
		}
		const st = status.get(num.label) ?? { committee: null, result: '', voteDate: null };
		const sources = [{ label: `${session.name}の概要・結果`, url: page.url, fetchedAt: page.fetchedAt }];
		let input = '';
		if (pdf) {
			const res = await get(pdf);
			input = `【議案本文】\n${await pdfText(res.body)}\n`;
			sources.push({ label: `${num.label}（PDF）`, url: pdf, fetchedAt: res.fetchedAt });
		} else warnings.push(`${num.label}: no bill PDF found`);

		const out = outcome(st.result, st.committee, submitted, st.voteDate);
		if (!out) {
			warnings.push(`${num.label}: unrecognised result 「${st.result}」, skipped`);
			continue;
		}
		bills.push({
			facts: { id: billId(assembly.id, s, num.n, num.by), assembly: assembly.id, number: num.label, official: squash(official), by: num.by, session: session.name, committee: st.committee, ...out, sources },
			input
		});
	}
	return { bills, warnings };
}
