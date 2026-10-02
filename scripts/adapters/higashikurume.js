// 東久留米市議会. 付議案件及び結果 → 「令和8年」 → per session a 付議案件 page (番号 「議案第65号」 | 件名 | 付託先,
// 即決 = none) and, as votes happen, a 会議結果 page (番号 | 件名 | 議決日 「9月28日」 | 議決結果 「原案可決 （全員）」).
// Mayor bills come as combined PDFs on 市長提出議案 → 「令和8年第2回市議会定例会 市長提出議案」 (the 一覧表 PDFs left
// out). Member bills have no text online.

import { billId, inScope, outcome, parseBillNumber, splitBills, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml, tableGrid } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');

/**
 * Rows of every table on a page, keyed by the bill label in the first column.
 * @param {import('../lib/fetch.js').FetchResult} page
 */
function rowsByLabel(page) {
	const $ = loadHtml(page.body, page.contentType);
	/** @type {Map<string, string[]>} */
	const rows = new Map();
	for (const table of $('table').toArray()) for (const row of tableGrid($, table).slice(1)) if (row[0] && !rows.has(key(row[0]))) rows.set(key(row[0]), row.map(squash));
	return rows;
}

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
	const [resultsIndex, textsIndex] = assembly.listPages;
	const name = key(session.name);

	const ri = await get(resultsIndex.url);
	const [yearLink] = findLinks(loadHtml(ri.body, ri.contentType), ri.url, (t) => key(t) === `令和${s.year - 2018}年`);
	if (!yearLink) return { bills, warnings: [`No 令和${s.year - 2018}年 page on ${ri.url}`] };
	const yearPage = await get(yearLink.href);
	const $y = loadHtml(yearPage.body, yearPage.contentType);
	const [agendaLink] = findLinks($y, yearPage.url, (t) => key(t) === `${name}付議案件`);
	if (!agendaLink) return { bills, warnings: [`No 付議案件 page for ${session.name}`] };
	const agendaPage = await get(agendaLink.href);
	const [resultsLink] = findLinks($y, yearPage.url, (t) => key(t) === `${name}会議結果`);
	const resultsPage = resultsLink ? await get(resultsLink.href) : null;
	const results = resultsPage ? rowsByLabel(resultsPage) : new Map();

	/** @type {Map<number, string>} */
	const texts = new Map();
	/** @type {Map<number, { url: string, fetchedAt: string }>} */
	const textSource = new Map();
	const ti = await get(textsIndex.url);
	const [textsLink] = findLinks(loadHtml(ti.body, ti.contentType), ti.url, (t) => key(t) === `${name.replace(/(第\d+回)/, '$1市議会')}市長提出議案`);
	if (textsLink) {
		const tp = await get(textsLink.href);
		for (const l of findLinks(loadHtml(tp.body, tp.contentType), tp.url, (t, h) => h.endsWith('.pdf') && !t.includes('一覧表'))) {
			const res = await get(l.href);
			for (const [n, text] of splitBills(await pdfText(res.body))) {
				texts.set(n, text);
				textSource.set(n, { url: l.href, fetchedAt: res.fetchedAt });
			}
		}
	} else {
		warnings.push(`No 市長提出議案 page for ${session.name}`);
	}

	for (const [label, [, title, referral]] of rowsByLabel(agendaPage)) {
		const num = parseBillNumber(label);
		if (!num || !inScope(title)) continue;
		if (num.by === 'committee') {
			warnings.push(`${num.label} (committee bill) skipped: not supported yet`);
			continue;
		}
		const committee = key(referral ?? '').endsWith('委員会') ? key(referral) : null;
		const sources = [{ label: `${session.name} 付議案件`, url: agendaPage.url, fetchedAt: agendaPage.fetchedAt }];

		const r = results.get(label);
		const d = key(r?.[2] ?? '').match(/^(\d+)月(\d+)日$/);
		const voteDate = d ? `${s.year}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}` : null;
		if (r && resultsPage) sources.push({ label: `${session.name} 会議結果`, url: resultsPage.url, fetchedAt: resultsPage.fetchedAt });

		const text = num.by === 'head' ? (texts.get(num.n) ?? '') : '';
		const src = textSource.get(num.n);
		if (text && src) sources.push({ label: `${num.label}（PDF）`, ...src });
		else if (num.by === 'head') warnings.push(`${num.label}: no bill text found`);

		const out = outcome(key(r?.[3] ?? ''), committee, text ? submittedDate(text) : null, voteDate);
		if (!out) {
			warnings.push(`${num.label}: unrecognised result 「${r?.[3]}」, skipped`);
			continue;
		}
		bills.push({
			facts: {
				id: billId(assembly.id, s, num.n, num.by),
				assembly: assembly.id,
				number: num.label,
				official: title,
				by: num.by,
				session: session.name,
				committee,
				...out,
				sources,
				...(text ? {} : { titleOnly: true })
			},
			input: text ? `【議案本文】\n${text}\n` : ''
		});
	}
	return { bills, warnings };
}
