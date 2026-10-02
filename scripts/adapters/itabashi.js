// 板橋区議会. Three sources per session, all numbered 議案第N号 in one sequence (member bills included):
// - 議案の審査状況 page: 議案番号 | 件名 | 付託委員会 (ー = none, merged across rows), from the start of the session.
// - 議案書: year page → 「令和8年第2回定例会の議案書（第40-64号）」 → one PDF per bill. The PDF's 提出者 tells
//   区長 bills from member bills (「板橋区議会議員」).
// - 議案等の審査結果: one PDF per session once it closes, 「令和8年第2回定例会（令和8年6月22日）」, with rows
//   「40 企画総務委員会 〇〇… 43 0 原案可決」. Titles in it can be garbled, so only number and result are read.
//   A session voting on several days doesn't say which bill was voted when; those dates stay the submission date.

import { billId, inScope, outcome, stripFileNote, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml, tableGrid } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseReiwaDate, parseSessionName, stripCjkSpaces } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');
const RESULT_ROW = /(\d{1,3})\s*[^\d\s][^\d]*?(\d{1,2})\s+(\d{1,2})\s*(原案可決|修正可決|可決|否決|承認|不承認|同意|不同意|認定|不認定)/g;

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
	const [statusIndex, textsIndex, resultsIndex] = assembly.listPages;
	const name = key(session.name);

	const si = await get(statusIndex.url);
	const [statusLink] = findLinks(loadHtml(si.body, si.contentType), si.url, (t) => key(t) === `議案の審査状況(${name})`);
	if (!statusLink) return { bills, warnings: [`No 議案の審査状況 page for ${session.name} on ${si.url}`] };
	const statusPage = await get(statusLink.href);

	// Bill number → PDF, via the year's 議案書 page.
	/** @type {Map<number, string>} */
	const pdfFor = new Map();
	const ti = await get(textsIndex.url);
	const [yearLink] = findLinks(loadHtml(ti.body, ti.contentType), ti.url, (t) => key(t) === `令和${s.year - 2018}年`);
	const yearPage = yearLink ? await get(yearLink.href) : null;
	const [textsLink] = yearPage ? findLinks(loadHtml(yearPage.body, yearPage.contentType), yearPage.url, (t) => key(t).startsWith(`${name}の議案書`)) : [];
	if (textsLink) {
		const page = await get(textsLink.href);
		for (const l of findLinks(loadHtml(page.body, page.contentType), page.url, (_, href) => href.endsWith('.pdf'))) {
			const m = key(l.text).match(/^議案第(\d+)号/);
			if (m) pdfFor.set(Number(m[1]), l.href);
		}
	} else {
		warnings.push(`No 議案書 page for ${session.name}`);
	}

	// Results once the session has closed: number → result, and the vote date when the session voted on one day.
	/** @type {Map<number, string>} */
	const results = new Map();
	let resultsSource = null;
	let voteDate = null;
	const ri = await get(resultsIndex.url);
	const [resultsLink] = findLinks(loadHtml(ri.body, ri.contentType), ri.url, (t, href) => href.endsWith('.pdf') && key(t).startsWith(`${name}(`));
	if (resultsLink) {
		const res = await get(resultsLink.href);
		resultsSource = { label: `${session.name} 議案等に対する審査結果`, url: res.url, fetchedAt: res.fetchedAt };
		const days = key(resultsLink.text).match(/\((.*?)\)/)?.[1] ?? '';
		voteDate = /、/.test(days) ? null : parseReiwaDate(days);
		for (const m of (await pdfText(res.body)).matchAll(RESULT_ROW)) {
			const n = Number(m[1]);
			if (results.has(n)) warnings.push(`議案第${n}号 appears twice in the results PDF; keeping the first`);
			else results.set(n, m[4]);
		}
	}

	const $ = loadHtml(statusPage.body, statusPage.contentType);
	// Bills sharing a committee share one rowspan cell.
	for (const [numText, title, committeeCell] of $('table').toArray().flatMap((t) => tableGrid($, t).slice(1))) {
		const n = Number(key(numText ?? ''));
		if (!Number.isInteger(n) || n < 1) continue;
		const number = `議案第${n}号`;
		const official = stripFileNote(title ?? '');
		if (!inScope(official)) continue;

		const c = key(committeeCell ?? '');
		const committee = c.endsWith('委員会') ? c : null;
		const sources = [{ label: `議案の審査状況（${session.name}）`, url: statusPage.url, fetchedAt: statusPage.fetchedAt }];
		if (resultsSource) sources.push(resultsSource);

		let input = '';
		let submitted = null;
		/** @type {'head' | 'member' | 'committee'} */
		let by = 'head';
		const href = pdfFor.get(n);
		if (href) {
			const res = await get(href);
			const text = await pdfText(res.body);
			const submitter = stripCjkSpaces(text).match(/提出者\s*(\S+)/)?.[1] ?? '';
			by = /議会議員/.test(submitter) ? 'member' : /委員会|委員長/.test(submitter) ? 'committee' : 'head';
			submitted = submittedDate(text);
			input = `【議案本文】\n${text}\n`;
			sources.push({ label: `${number}（PDF）`, url: href, fetchedAt: res.fetchedAt });
		} else {
			warnings.push(`${number}: no bill PDF found`);
		}
		if (by === 'committee') {
			warnings.push(`${number} (committee bill) skipped: not supported yet`);
			continue;
		}

		const result = results.get(n) ?? '';
		if (resultsSource && !result) warnings.push(`${number}: not in the results PDF`);
		const out = outcome(result, committee, submitted, voteDate);
		if (!out) {
			warnings.push(`${number}: unrecognised result 「${result}」, skipped`);
			continue;
		}
		bills.push({
			facts: { id: billId(assembly.id, s, n, by), assembly: assembly.id, number, official, by, session: session.name, committee, ...out, sources },
			input
		});
	}
	return { bills, warnings };
}
