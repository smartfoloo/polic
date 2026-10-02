// 新宿区議会. The sessions page (定例会・臨時会) links each session's page. A session page
// lists every bill under h2 「議案」 as <br>-separated lines (「・第44号議案 title」, 「・議員提出議案第7号 title」),
// and once the session closes links 「議案の概要と審議結果」, a PDF with one row per bill in that same order. Its
// text comes out scrambled except for the rows' results (「〇〇×〇…可決」), so results are matched by position
// and only when the counts agree. No vote date or committee is published; dates are the submission date.
// 区長 bill PDFs are on 区長提出議案 → 「令和8年第2回定例会提出議案」. Member bills have no text online.

import * as cheerio from 'cheerio';
import { billId, inScope, outcome, parseBillNumber, stripFileNote, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');
const RESULT_ROW = /^[〇○×\s]+(原案可決|修正可決|可決|否決|承認|不承認|同意|不同意|認定|不認定|継続審査|継続)\s*$/gm;

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
	const [sessionsIndex, textsIndex] = assembly.listPages;
	const name = key(session.name);

	// Past sessions are 「第2回定例会」 links after a <strong>【令和8年】</strong>; the current one is 「令和8年第3回定例会の主な日程」.
	const si = await get(sessionsIndex.url);
	const $i = loadHtml(si.body, si.contentType);
	const year = $i('strong').filter((_, e) => key($i(e).text()) === `【令和${s.year - 2018}年】`).first();
	const href =
		$i('a').toArray().find((a) => key($i(a).text()) === `${name}の主な日程`)?.attribs.href ??
		year.nextUntil('strong').filter('a').toArray().find((a) => key($i(a).text()) === `第${s.n}回${s.kind}`)?.attribs.href;
	if (!href) return { bills, warnings: [`${session.name} is not on ${si.url}`] };
	const page = await get(new URL(href, si.url).href);
	const $ = loadHtml(page.body, page.contentType);

	const section = $('h2').filter((_, h) => key($(h).text()) === '議案').first().nextUntil('h2');
	const lines = cheerio
		.load(section.toArray().map((e) => $.html(e).replace(/<br\s*\/?>/gi, '\n')).join('\n'))('body')
		.text()
		.split('\n')
		.map((l) => l.replace(/ /g, ' ').trim())
		.filter((l) => l.startsWith('・'));
	const entries = lines.map((l) => {
		const m = l.slice(1).trim().match(/^(.*?第\s*\d+\s*号(?:議案)?)\s*(.+)$/);
		return m ? { label: key(m[1]), official: stripFileNote(m[2]) } : null;
	});
	if (entries.includes(null)) warnings.push(`Unparsed bill lines on ${page.url}`);

	/** @type {string[]} */
	let results = [];
	let resultsSource = null;
	const [resultsLink] = findLinks($, page.url, (t, h) => h.endsWith('.pdf') && key(t) === '議案の概要と審議結果');
	if (resultsLink) {
		const res = await get(resultsLink.href);
		results = [...(await pdfText(res.body)).matchAll(RESULT_ROW)].map((m) => m[1]);
		resultsSource = { label: `${session.name} 議案の概要と審議結果`, url: res.url, fetchedAt: res.fetchedAt };
		if (results.length !== entries.length) {
			warnings.push(`${results.length} results for ${entries.length} bills in ${res.url}; results skipped`);
			if (session.closes < new Date().toISOString().slice(0, 10)) return { bills, warnings };
			results = [];
		}
	}

	/** @type {Map<number, string>} */
	const pdfFor = new Map();
	const ti = await get(textsIndex.url);
	const [textsLink] = findLinks(loadHtml(ti.body, ti.contentType), ti.url, (t) => key(t) === `${name}提出議案`);
	if (textsLink) {
		const tp = await get(textsLink.href);
		for (const l of findLinks(loadHtml(tp.body, tp.contentType), tp.url, (_, h) => h.endsWith('.pdf'))) {
			const m = key(l.text).match(/^第(\d+)号議案/);
			if (m) pdfFor.set(Number(m[1]), l.href);
		}
	} else {
		warnings.push(`No 提出議案 page for ${session.name}`);
	}

	for (const [i, entry] of entries.entries()) {
		if (!entry || !inScope(entry.official)) continue;
		const num = parseBillNumber(entry.label);
		if (!num) continue;
		if (num.by === 'committee') {
			warnings.push(`${num.label} (committee bill) skipped: not supported yet`);
			continue;
		}
		const sources = [{ label: session.name, url: page.url, fetchedAt: page.fetchedAt }];
		if (resultsSource && results.length) sources.push(resultsSource);

		let input = '';
		let submitted = null;
		const pdf = num.by === 'head' ? pdfFor.get(num.n) : undefined;
		if (pdf) {
			const res = await get(pdf);
			const text = await pdfText(res.body);
			submitted = submittedDate(text);
			input = `【議案本文】\n${text}\n`;
			sources.push({ label: `${num.label}（PDF）`, url: pdf, fetchedAt: res.fetchedAt });
		} else if (num.by === 'head') {
			warnings.push(`${num.label}: no bill PDF found`);
		}

		const out = outcome(results[i] ?? '', null, submitted);
		if (!out) {
			warnings.push(`${num.label}: unrecognised result 「${results[i]}」, skipped`);
			continue;
		}
		bills.push({
			facts: {
				id: billId(assembly.id, s, num.n, num.by),
				assembly: assembly.id,
				number: num.label,
				official: entry.official,
				by: num.by,
				session: session.name,
				committee: null,
				...out,
				sources,
				...(input ? {} : { titleOnly: true })
			},
			input
		});
	}
	return { bills, warnings };
}
