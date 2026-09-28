// 杉並区議会. The results table names the committee inline and has a vote-date column;
// per-bill PDFs and one 議案説明資料 PDF (a section per bill) are on the session's 提案事項 page.

import { billId, inScope, statusFrom, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml, tableRows } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseReiwaDate, parseSessionName, toNumber } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

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

	const entry = await get(assembly.listPages[0].url);
	const yearLabel = session.name.slice(0, session.name.indexOf('年') + 1);
	const [yearLink] = findLinks(loadHtml(entry.body), entry.url, (t) => t.includes(`${yearLabel}議案・議決結果の一覧`));
	if (!yearLink) return { bills, warnings: [`No ${yearLabel} index on ${entry.url}`] };

	const yearPage = await get(yearLink.href);
	const [sessionLink] = findLinks(loadHtml(yearPage.body), yearPage.url, (t) => t.includes(`${session.name}議案・議決結果の一覧`));
	if (!sessionLink) return { bills, warnings: [`${session.name} not listed on ${yearPage.url}`] };

	const page = await get(sessionLink.href);
	const $ = loadHtml(page.body);
	const rows = tableRows($, $('table').first(), page.url).slice(1);

	const [teianLink] = findLinks($, page.url, (t) => t.includes('提案事項'));
	/** @type {Map<string, string>} bill number label → PDF url */
	const pdfByNumber = new Map();
	// A session can have several 説明資料 PDFs (e.g. one more for bills added later).
	/** @type {Map<number, { text: string, url: string, fetchedAt: string }>} */
	const explanation = new Map();
	if (teianLink) {
		const teian = await get(teianLink.href);
		const setumeiUrls = [];
		for (const l of findLinks(loadHtml(teian.body), teian.url, (_, href) => href.endsWith('.pdf'))) {
			const m = l.text.normalize('NFKC').match(/^((?:議員提出)?議案第\d+号)/);
			if (m) pdfByNumber.set(m[1], l.href);
			if (l.text.includes('説明資料')) setumeiUrls.push(l.href);
		}
		for (const url of setumeiUrls) {
			const res = await get(url);
			const text = await pdfText(res.body);
			const heads = [...text.matchAll(/（議案第([0-9０-９]+)号）/g)];
			heads.forEach((h, i) =>
				explanation.set(toNumber(h[1]), { text: text.slice(h.index, heads[i + 1]?.index ?? text.length).trim(), url, fetchedAt: res.fetchedAt })
			);
		}
	} else {
		warnings.push(`No 提案事項 link on ${page.url}`);
	}

	for (const [numCell, titleCell, dateCell, resultCell] of rows) {
		if (!numCell || !titleCell) continue;
		const numLabel = numCell.text.normalize('NFKC');
		const m = numLabel.match(/^(議員提出議案)?第(\d+)号$/);
		if (!m) continue;
		const by = m[1] ? 'member' : 'head';
		const n = Number(m[2]);

		const committee = titleCell.text.match(/（([^（）]+委員会)付託案件）/)?.[1] ?? null;
		const official = titleCell.text.replace(/（[^（）]+付託案件）$/, '').trim();
		if (!inScope(official)) continue;

		const st = statusFrom(resultCell?.text ?? '', committee !== null);
		if (!st) {
			warnings.push(`${numLabel}: unrecognised result 「${resultCell?.text}」, skipped`);
			continue;
		}

		const sources = [{ label: `${session.name} 議案・議決結果の一覧`, url: page.url, fetchedAt: page.fetchedAt }];
		let input = '';
		let submitted = null;
		const pdfUrl = pdfByNumber.get(by === 'member' ? `議員提出議案第${n}号` : `議案第${n}号`);
		if (pdfUrl) {
			const pdf = await get(pdfUrl);
			const text = await pdfText(pdf.body);
			submitted = submittedDate(text);
			input += `【議案本文】\n${text}\n`;
			sources.push({ label: `${by === 'member' ? '議員提出' : ''}議案第${n}号（PDF）`, url: pdfUrl, fetchedAt: pdf.fetchedAt });
		} else {
			warnings.push(`${numLabel}: no bill PDF found`);
		}
		const ex = by === 'head' ? explanation.get(n) : undefined;
		if (ex) {
			input += `\n【議案説明資料】\n${ex.text}\n`;
			sources.push({ label: '議案説明資料（PDF）', url: ex.url, fetchedAt: ex.fetchedAt });
		}

		const voted = st.stage === 3 ? parseReiwaDate(dateCell?.text ?? '') : null;
		bills.push({
			facts: {
				id: billId(assembly.id, s, n, by),
				assembly: assembly.id,
				number: numLabel,
				official,
				by,
				session: session.name,
				committee,
				...st,
				dateKind: voted ? (st.status === '否決' ? '否決' : '可決') : '提案',
				date: voted ?? submitted,
				sources
			},
			input
		});
	}
	return { bills, warnings };
}
