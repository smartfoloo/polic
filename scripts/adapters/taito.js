// 台東区議会. Each session has an index page linking 「…に提出された議案」 (番号 | 件名 with the bill PDF |
// 提出者 | a one-line 内容) and 「…の会議結果」: one table per sitting day, dated by the heading above it.
// A bill's first row there records its referral (「保健福祉委員会」に付託…), a later one the vote
// (原案可決（全員賛成）); bills voted together share 経過 and 結果 cells across rows.

import { billId, inScope, statusFrom, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml, tableGrid } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseReiwaDate, parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */
/** @typedef {(url: string) => Promise<import('../lib/fetch.js').FetchResult>} Get */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');

/** 第79号議案 (head) · 議員提出第5号議案 (member) */
function parseNumber(/** @type {string} */ text) {
	const m = key(text).match(/^(議員提出)?第(\d+)号議案$/);
	return m ? { by: /** @type {'head' | 'member'} */ (m[1] ? 'member' : 'head'), n: Number(m[2]), label: m[0] } : null;
}

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

	let sessionLink = null;
	for (const { url } of assembly.listPages) {
		const index = await get(url);
		[sessionLink] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === key(session.name));
		if (sessionLink) break;
	}
	if (!sessionLink) return { bills, warnings: [`${session.name} is not on any of the listed index pages`] };
	const sessionPage = await get(sessionLink.href);
	const $s = loadHtml(sessionPage.body, sessionPage.contentType);
	const [billsLink] = findLinks($s, sessionPage.url, (t) => t.endsWith('に提出された議案'));
	const [resultsLink] = findLinks($s, sessionPage.url, (t) => t.endsWith('の会議結果'));
	if (!billsLink) return { bills, warnings: [`No 提出された議案 page for ${session.name}`] };

	const outcomes = resultsLink ? await results(await get(resultsLink.href)) : null;
	if (!outcomes) warnings.push(`No 会議結果 page for ${session.name} yet; bills stay pending`);

	const list = await get(billsLink.href);
	const $ = loadHtml(list.body, list.contentType);
	for (const table of $('table').toArray()) {
		const trs = $(table).find('tr').toArray();
		const headers = $(trs[0]).children().toArray().map((c) => key($(c).text()));
		const [cNum, cTitle, cGist] = ['議案番号', '件名', '内容'].map((h) => headers.indexOf(h));
		if (cNum < 0 || cTitle < 0) continue;

		for (const tr of trs.slice(1)) {
			const cells = $(tr).children('td').toArray().map((td) => $(td));
			const num = parseNumber(cells[cNum]?.text() ?? '');
			if (!num) continue;
			const official = squash(cells[cTitle].text().normalize('NFKC').replace(/\(PDF[^)]*\)/g, ''));
			if (!inScope(official)) continue;

			const outcome = outcomes?.results.get(num.label);
			const committee = outcome?.committee ?? null;
			const st = statusFrom(outcome?.result ?? '', committee !== null);
			if (!st) {
				warnings.push(`${num.label}: unrecognised result 「${outcome?.result}」, skipped`);
				continue;
			}

			const sources = [{ label: `${session.name}に提出された議案`, url: list.url, fetchedAt: list.fetchedAt }];
			if (outcomes) sources.push({ label: `${session.name}の会議結果`, url: outcomes.url, fetchedAt: outcomes.fetchedAt });
			const gist = cGist >= 0 ? squash(cells[cGist]?.text() ?? '') : '';
			let input = gist ? `【概要】\n${gist}\n` : '';
			let submitted = null;
			const pdf = cells[cTitle].find('a[href$=".pdf"]').attr('href');
			if (pdf) {
				const href = new URL(pdf, list.url).href;
				const res = await get(href);
				const text = await pdfText(res.body);
				submitted = submittedDate(text);
				input += `\n【議案本文】\n${text}\n`;
				sources.push({ label: `${num.label}（PDF）`, url: href, fetchedAt: res.fetchedAt });
			} else {
				warnings.push(`${num.label}: no bill PDF found`);
			}

			const voted = st.stage === 3 ? (outcome?.date ?? null) : null;
			bills.push({
				facts: {
					id: billId(assembly.id, s, num.n, num.by),
					assembly: assembly.id,
					number: num.label,
					official,
					by: num.by,
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
	}
	return { bills, warnings };
}

/**
 * Committee, result and vote date per bill from the 会議結果 page.
 * @param {import('../lib/fetch.js').FetchResult} page
 */
async function results(page) {
	const $ = loadHtml(page.body, page.contentType);
	/** @type {Map<string, { committee: string | null, result: string, date: string | null }>} */
	const byNumber = new Map();
	let date = null;
	for (const el of $('h2, h3, h4, table').toArray()) {
		if (el.tagName !== 'table') {
			date = parseReiwaDate($(el).text()) ?? date;
			continue;
		}
		const grid = tableGrid($, el);
		const headers = (grid[0] ?? []).map(key);
		const [cNum, cProgress, cResult] = ['議案番号', '経過', '議決結果'].map((h) => headers.indexOf(h));
		if (cNum < 0) continue;
		for (const row of grid.slice(1)) {
			const num = parseNumber(row[cNum] ?? '');
			if (!num) continue;
			const entry = byNumber.get(num.label) ?? { committee: null, result: '', date: null };
			const referred = (row[cProgress] ?? '').match(/「([^」]+委員会)」に付託/);
			if (referred) entry.committee = referred[1];
			if (row[cResult]) Object.assign(entry, { result: row[cResult], date });
			byNumber.set(num.label, entry);
		}
	}
	return { results: byNumber, url: page.url, fetchedAt: page.fetchedAt };
}
