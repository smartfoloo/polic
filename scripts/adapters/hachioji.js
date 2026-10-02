// 八王子市議会. The year page links each session (「令和8年(2026年)第2回市議会定例会」), whose page has a table per
// kind: 議案番号 (「第68号」 / 「議員提出議案第5号」) | 件名 | 付託委員会 (abbreviated; a legend below maps
// 「・総務 ⇒ 総務企画委員会」) | 委員会開催日 | 議決年月日 (「6月25日」) | 議決結果. Member bill PDFs are linked from the
// session page. Mayor bills come as combined PDFs on 市長が市議会に提出した議案 → 「令和8年第2回定例会提出分」.

import { billId, inScope, outcome, parseBillNumber, splitBills, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml, tableGrid } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName, squash, stripCjkSpaces } from '../lib/text.js';

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
	const [yearIndex, textsIndex] = assembly.listPages;

	const yi = await get(yearIndex.url);
	const [sessionLink] = findLinks(loadHtml(yi.body, yi.contentType), yi.url, (t) => key(t) === `令和${s.year - 2018}年(${s.year}年)第${s.n}回市議会${s.kind}`);
	if (!sessionLink) return { bills, warnings: [`${session.name} is not on ${yi.url}`] };
	const page = await get(sessionLink.href);
	const $ = loadHtml(page.body, page.contentType);

	/** @type {Map<string, string>} */
	const committees = new Map();
	for (const m of $('body').text().normalize('NFKC').matchAll(/・\s*(\S+?)\s*⇒\s*(\S+?委員会)(?=[\s、]|$)/g)) committees.set(m[1], m[2]);

	// Mayor bills: number → text, from the session's combined PDFs (the 概要 PDF left out).
	/** @type {Map<number, string>} */
	const texts = new Map();
	/** @type {Map<number, { url: string, fetchedAt: string }>} */
	const textSource = new Map();
	const ti = await get(textsIndex.url);
	const [textsLink] = findLinks(loadHtml(ti.body, ti.contentType), ti.url, (t) => key(t) === `${key(session.name)}提出分`);
	if (textsLink) {
		const tp = await get(textsLink.href);
		for (const l of findLinks(loadHtml(tp.body, tp.contentType), tp.url, (t, h) => h.endsWith('.pdf') && !t.includes('概要'))) {
			const res = await get(l.href);
			for (const [n, text] of splitBills(await pdfText(res.body))) {
				texts.set(n, text);
				textSource.set(n, { url: l.href, fetchedAt: res.fetchedAt });
			}
		}
	} else {
		warnings.push(`No 提出分 page for ${session.name}`);
	}

	for (const table of $('table').toArray()) {
		const [header, ...rows] = tableGrid($, table);
		const col = (/** @type {string} */ h) => header.findIndex((c) => key(c).startsWith(h));
		const [cNum, cTitle, cCommittee, cDate, cResult] = ['議案番号', '件名', '付託委員会', '議決年月日', '議決結果'].map(col);
		if (cNum < 0 || cTitle < 0 || cResult < 0) continue;

		for (const row of rows) {
			const num = parseBillNumber(row[cNum] ?? '');
			if (!num) continue;
			const official = stripCjkSpaces(squash(row[cTitle]));
			if (!inScope(official)) continue;
			if (num.by === 'committee') {
				warnings.push(`${num.label} (committee bill) skipped: not supported yet`);
				continue;
			}
			const number = num.by === 'head' ? `第${num.n}号議案` : num.label;

			const abbr = key(row[cCommittee] ?? '');
			const committee = committees.get(abbr) ?? null;
			if (!committee && abbr && abbr !== 'ー') warnings.push(`${number}: unknown committee 「${abbr}」`);
			const d = key(row[cDate] ?? '').match(/^(\d+)月(\d+)日$/);
			const voteDate = d ? `${s.year}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}` : null;

			const sources = [{ label: session.name, url: page.url, fetchedAt: page.fetchedAt }];
			let text = '';
			if (num.by === 'head') {
				text = texts.get(num.n) ?? '';
				const src = textSource.get(num.n);
				if (src) sources.push({ label: `${number}（PDF）`, ...src });
			} else {
				const [link] = findLinks($, page.url, (t, h) => h.endsWith('.pdf') && key(t).startsWith(num.label));
				if (link) {
					const res = await get(link.href);
					text = await pdfText(res.body);
					sources.push({ label: `${number}（PDF）`, url: link.href, fetchedAt: res.fetchedAt });
				}
			}
			if (!text) warnings.push(`${number}: no bill text found`);

			const out = outcome(key(row[cResult]), committee, text ? submittedDate(text) : null, voteDate);
			if (!out) {
				warnings.push(`${number}: unrecognised result 「${row[cResult]}」, skipped`);
				continue;
			}
			bills.push({
				facts: { id: billId(assembly.id, s, num.n, num.by), assembly: assembly.id, number, official, by: num.by, session: session.name, committee, ...out, sources },
				input: text ? `【議案本文】\n${text}\n` : ''
			});
		}
	}
	return { bills, warnings };
}
