// 葛飾区議会 (katsushika-kugikai.jp, Shift_JIS, table layout). Three index pages each link one page per
// session (「令和８年 第３回定例会」): 議案一覧・付託表 (two rows per bill: number, title, committee, then the
// 議案概要), 議決結果・賛否一覧 (one table per vote day, dated in the text just above it) and 議案 (the PDFs).

import { billId, inScope, statusFrom, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml, tableGrid } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseReiwaDate, parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */
/** @typedef {(url: string) => Promise<import('../lib/fetch.js').FetchResult>} Get */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');

/** 議案第54号 (head) · 議員提出議案第7号 (member), however it is spaced */
function parseNumber(/** @type {string} */ text) {
	const m = key(text).match(/^(議員提出)?議案第(\d+)号/);
	return m ? { by: /** @type {'head' | 'member'} */ (m[1] ? 'member' : 'head'), n: Number(m[2]), label: m[0] } : null;
}

/**
 * The page for this session linked from one of the index pages.
 * @param {string} indexUrl
 * @param {string} sessionName
 * @param {Get} get
 */
async function sessionPage(indexUrl, sessionName, get) {
	const index = await get(indexUrl);
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === key(sessionName));
	return link ? get(link.href) : null;
}

/** Innermost tables (the site nests its layout in tables) whose text includes the given header. */
function dataTables(/** @type {import('cheerio').CheerioAPI} */ $, /** @type {string} */ header) {
	return $('table')
		.toArray()
		.filter((t) => $(t).find('table').length === 0 && key($(t).text()).includes(header));
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
	const [referralIndex, resultIndex, pdfIndex] = assembly.listPages.map((p) => p.url);

	const list = await sessionPage(referralIndex, session.name, get);
	if (!list) return { bills, warnings: [`${session.name} is not on ${referralIndex}`] };
	const $ = loadHtml(list.body, list.contentType);

	/** @type {Map<string, { official: string, gist: string, committee: string | null }>} */
	const listed = new Map();
	for (const table of dataTables($, '付託委員会')) {
		for (const row of tableGrid($, table)) {
			const num = parseNumber(row[0] ?? '');
			if (!num) continue;
			const committee = key(row[2] ?? '');
			const seen = listed.get(num.label);
			// First row: title; second row (number and committee cells span both): 議案概要.
			if (seen) seen.gist = row[1] ?? '';
			else listed.set(num.label, { official: row[1] ?? '', gist: '', committee: committee.endsWith('委員会') ? committee : null });
		}
	}

	const outcomes = await results(resultIndex, session.name, get);
	if (!outcomes) warnings.push(`No 議決結果 page for ${session.name} yet; bills stay pending`);

	/** @type {Map<string, string>} */
	const pdfs = new Map();
	const pdfPage = await sessionPage(pdfIndex, session.name, get);
	if (pdfPage) {
		const $p = loadHtml(pdfPage.body, pdfPage.contentType);
		for (const l of findLinks($p, pdfPage.url, (_, href) => href.endsWith('.pdf'))) {
			const num = parseNumber(l.text);
			if (num) pdfs.set(num.label, l.href);
		}
	}

	for (const [label, item] of listed) {
		const num = /** @type {NonNullable<ReturnType<typeof parseNumber>>} */ (parseNumber(label));
		const official = squash(item.official);
		if (!inScope(official)) continue;
		const outcome = outcomes?.byNumber.get(label);
		const st = statusFrom(outcome?.result ?? '', item.committee !== null);
		if (!st) {
			warnings.push(`${label}: unrecognised result 「${outcome?.result}」, skipped`);
			continue;
		}

		const sources = [{ label: `${session.name} 議案一覧・付託表`, url: list.url, fetchedAt: list.fetchedAt }];
		if (outcomes) sources.push({ label: `${session.name} 議決結果・賛否一覧`, url: outcomes.url, fetchedAt: outcomes.fetchedAt });
		let input = item.gist ? `【概要】\n${squash(item.gist)}\n` : '';
		let submitted = null;
		const href = pdfs.get(label);
		if (href) {
			const res = await get(href);
			const text = await pdfText(res.body);
			submitted = submittedDate(text);
			input += `\n【議案本文】\n${text}\n`;
			sources.push({ label: `${label}（PDF）`, url: href, fetchedAt: res.fetchedAt });
		} else {
			warnings.push(`${label}: no bill PDF found`);
		}

		const voted = st.stage === 3 ? (outcome?.date ?? null) : null;
		bills.push({
			facts: {
				id: billId(assembly.id, s, num.n, num.by),
				assembly: assembly.id,
				number: label,
				official,
				by: num.by,
				session: session.name,
				committee: item.committee,
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

/**
 * Result and vote date per bill. Each vote day's table follows a line with that day's date.
 * @param {string} indexUrl
 * @param {string} sessionName
 * @param {Get} get
 */
async function results(indexUrl, sessionName, get) {
	const page = await sessionPage(indexUrl, sessionName, get);
	if (!page) return null;
	const $ = loadHtml(page.body, page.contentType);
	const tables = new Set(dataTables($, '議決結果'));
	/** @type {Map<string, { result: string, date: string | null }>} */
	const byNumber = new Map();
	/** @type {string | null} */
	let date = null;

	/** @param {import('domhandler').AnyNode} node */
	const walk = (node) => {
		if (node.type === 'text') {
			date = parseReiwaDate(node.data) ?? date;
			return;
		}
		if (!('children' in node)) return;
		if (node.type === 'tag' && tables.has(node)) {
			for (const row of tableGrid($, node)) {
				const num = parseNumber(row[0] ?? '');
				if (num && row[2]) byNumber.set(num.label, { result: row[2], date });
			}
			return;
		}
		node.children.forEach(walk);
	};
	walk($.root()[0]);
	return { byNumber, url: page.url, fetchedAt: page.fetchedAt };
}
