// 東大和市議会. A year page lists each session's 議案等審議結果 page (「令和8年第2回定例会（令和8年6月2日～
// 6月19日）議案等審議結果」): a table per kind with 番号 (第35号議案 · 議第7号議案 member · 委第1号議案
// committee) | 件名 | 上程日 | 付託日 付託先 (「令和8年6月2日 総務」, or 「－ 省略」) | 議決日 議決結果. Bill PDFs are on
// the city's 市長提出議案 page per session (「第35号議案 title （PDF …）」). Those PDFs are scans without a
// text layer, so the text is empty until OCR is added.

import { billId, inScope, outcome, stripFileNote, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml, tableGrid } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseReiwaDate, parseSessionName } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '').replace('東大和市議会', '');

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
	const [resultsIndex, billsIndex] = assembly.listPages;

	const ri = await get(resultsIndex.url);
	const [resultsLink] = findLinks(loadHtml(ri.body, ri.contentType), ri.url, (t) => key(t).startsWith(`${key(session.name)}(`) && key(t).endsWith('議案等審議結果'));
	if (!resultsLink) return { bills, warnings: [`${session.name} is not on ${ri.url}`] };
	const page = await get(resultsLink.href);
	const $ = loadHtml(page.body, page.contentType);

	/** @type {Map<number, string>} */
	const pdfs = new Map();
	const bi = await get(billsIndex.url);
	const [billsLink] = findLinks(loadHtml(bi.body, bi.contentType), bi.url, (t) => key(t) === key(session.name));
	if (billsLink) {
		const bp = await get(billsLink.href);
		for (const l of findLinks(loadHtml(bp.body, bp.contentType), bp.url, (_, href) => href.endsWith('.pdf'))) {
			const n = stripFileNote(l.text).match(/^第(\d+)号議案/)?.[1];
			if (n) pdfs.set(Number(n), l.href);
		}
	} else warnings.push(`No 市長提出議案 page for ${session.name}`);

	for (const table of $('table').toArray()) {
		const grid = tableGrid($, table);
		if (!grid[0]?.some((c) => key(c) === '番号')) continue;
		const headers = grid[0].map(key);
		const col = (/** @type {RegExp} */ re) => headers.findIndex((c) => re.test(c));
		const [cNum, cTitle, cCommittee, cResult] = [/番号/, /件名/, /付託/, /議決/].map(col);
		for (const cells of grid.slice(1)) {
			const m = key(cells[cNum] ?? '').match(/^(議|委)?第(\d+)号議案$/);
			const official = cells[cTitle] ?? '';
			if (!m || !inScope(official)) continue;
			if (m[1] === '委') {
				warnings.push(`委第${m[2]}号議案 (committee bill) skipped: not supported yet`);
				continue;
			}
			const by = m[1] ? 'member' : 'head';
			const n = Number(m[2]);
			const label = by === 'member' ? `議第${n}号議案` : `第${n}号議案`;
			const c = key(cells[cCommittee] ?? '').replace(/^令和.+?日/, '').replace(/^[-－]/, '');
			const committee = c && c !== '省略' ? (c.endsWith('委員会') ? c : `${c}委員会`) : null;
			const result = cells[cResult] ?? '';

			const sources = [{ label: `${session.name} 議案等審議結果`, url: page.url, fetchedAt: page.fetchedAt }];
			let input = '';
			let submitted = null;
			const href = by === 'head' ? pdfs.get(n) : undefined;
			if (href) {
				const res = await get(href);
				const text = await pdfText(res.body);
				submitted = submittedDate(text);
				if (text.trim()) input = `【議案本文】\n${text}\n`;
				else warnings.push(`${label}: the PDF is a scan with no text`);
				sources.push({ label: `${label}（PDF）`, url: href, fetchedAt: res.fetchedAt });
			} else if (by === 'head') warnings.push(`${label}: no bill PDF found`);

			const out = outcome(result, committee, submitted ?? parseReiwaDate(cells[col(/上程/)] ?? ''));
			if (!out) {
				warnings.push(`${label}: unrecognised result 「${result}」, skipped`);
				continue;
			}
			bills.push({
				facts: { id: billId(assembly.id, s, n, by), assembly: assembly.id, number: label, official, by, session: session.name, committee, ...out, ...(input ? {} : { titleOnly: true }), sources },
				input
			});
		}
	}
	return { bills, warnings };
}
