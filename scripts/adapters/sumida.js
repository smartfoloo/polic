// 墨田区議会. A year-long session: each meeting (「令和8年度定例会9月議会」) has one page with a table per
// kind of bill: 議案番号 | 件名 (bill PDF) | 資料 (概要, 新旧対照表 PDFs) | 付託委員会 | 結果. The committee
// cell spans its bills' rows and is abbreviated (企画総務 → 企画総務委員会). No vote date is published,
// so dates are the submission date from the PDF. Meetings are listed on one index page per fiscal year.

import { billId, inScope, statusFrom, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */
/** @typedef {(url: string) => Promise<import('../lib/fetch.js').FetchResult>} Get */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');
const stripSize = (/** @type {string} */ s) => squash(s.normalize('NFKC').replace(/\(PDF[^)]*\)/g, ''));

/**
 * @param {import('../../src/lib/config/assemblies.js').Assembly} assembly
 * @param {import('../../src/lib/config/assemblies.js').Session} session
 * @param {Get} get
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
		const index = await get(url);
		[link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === key(session.name));
		if (link) break;
	}
	if (!link) return { bills, warnings: [`${session.name} is not on any of the listed index pages`] };
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);

	for (const table of $('table').toArray()) {
		const trs = $(table).find('tr').toArray();
		const headers = $(trs[0]).children().toArray().map((c) => key($(c).text()));
		const [cNum, cTitle, cDocs, cCommittee, cResult] = ['議案番号', '件名', '資料', '付託委員会', '結果'].map((h) => headers.indexOf(h));
		if (cNum < 0 || cTitle < 0) continue;

		let committeeCell = '';
		for (const tr of trs.slice(1)) {
			// Rows under a spanning committee cell are one cell short: the committee column is missing.
			const tds = $(tr).children('td').toArray();
			const spanned = cCommittee >= 0 && tds.length === headers.length - 1;
			if (!spanned && tds.length !== headers.length) continue;
			const cells = headers.map((_, c) => $(spanned && c >= cCommittee ? tds[c - 1] : tds[c]));
			if (cCommittee >= 0 && !spanned) committeeCell = key(cells[cCommittee].text());

			const m = key(cells[cNum].text()).match(/^(議員提出議案)?第(\d+)号$/);
			if (!m) continue;
			const titleCell = cells[cTitle];
			const official = stripSize(titleCell.text());
			if (!inScope(official)) continue;
			const by = m[1] ? 'member' : 'head';
			const n = Number(m[2]);
			const label = `${m[1] ?? '議案'}第${n}号`;

			const committee = cCommittee < 0 || !committeeCell || committeeCell === 'ー' ? null : `${committeeCell}委員会`;
			const result = cResult >= 0 ? key(cells[cResult].text()) : '';
			const st = statusFrom(result, committee !== null);
			if (!st) {
				warnings.push(`${label}: unrecognised result 「${result}」, skipped`);
				continue;
			}

			const sources = [{ label: `${session.name} 議案等`, url: page.url, fetchedAt: page.fetchedAt }];
			let input = '';
			let submitted = null;
			const bodyHref = titleCell.find('a[href$=".pdf"]').attr('href');
			if (bodyHref) {
				const href = new URL(bodyHref, page.url).href;
				const res = await get(href);
				const text = await pdfText(res.body);
				submitted = submittedDate(text);
				input += `【議案本文】\n${text}\n`;
				sources.push({ label: `${label}（PDF）`, url: href, fetchedAt: res.fetchedAt });
			} else {
				warnings.push(`${label}: no bill PDF found`);
			}
			const outline = cDocs >= 0 ? cells[cDocs].find('a[href$=".pdf"]').filter((_, a) => stripSize($(a).text()) === '概要').attr('href') : undefined;
			if (outline) {
				const href = new URL(outline, page.url).href;
				const res = await get(href);
				input += `\n【議案の概要】\n${await pdfText(res.body)}\n`;
				sources.push({ label: `${label} 概要（PDF）`, url: href, fetchedAt: res.fetchedAt });
			}

			bills.push({
				facts: {
					id: billId(assembly.id, s, n, by),
					assembly: assembly.id,
					number: label,
					official,
					by,
					session: session.name,
					committee,
					...st,
					dateKind: '提案',
					date: submitted,
					sources
				},
				input
			});
		}
	}
	return { bills, warnings };
}
