// 国立市議会. The year page links each session (「令和8年国立市議会第1回定例会」), whose page links its 議案 page
// (one PDF per bill, 「第6号議案 title」 / 「議員提出第1号議案 title」; titles end 「…条例案」) and, once it
// closes, a 会議結果報告 PDF whose 議決結果 list runs 「第６号議案 title ３月２４日原案可決」 (継続審査 has no date).
// Committees are only in a scanned 付託事件一覧表, so none are recorded.

import { billId, inScope, outcome, parseBillNumber, stripFileNote, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');
const RESULT = /((?:議員提出)?第(\d+)号議案)(?:(?!第\d+号議案).)*?(?:(\d+)月(\d+)日)?(原案可決|修正可決|可決|否決|同意|不同意|承認|不承認|認定|不認定|継続審査)/g;

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

	let sessionLink = null;
	for (const { url } of assembly.listPages) {
		const year = await get(url);
		[sessionLink] = findLinks(loadHtml(year.body, year.contentType), year.url, (t) => key(t) === `令和${s.year - 2018}年国立市議会第${s.n}回${s.kind}`);
		if (sessionLink) break;
	}
	if (!sessionLink) return { bills, warnings: [`${session.name} is not on any of the listed year pages`] };
	const page = await get(sessionLink.href);
	const $ = loadHtml(page.body, page.contentType);
	const [billsLink] = findLinks($, page.url, (t) => t.includes('議案・請願・陳情'));
	if (!billsLink) return { bills, warnings: [`No 議案 page linked from ${page.url}`] };

	/** @type {Map<string, { result: string, date: string | null }>} */
	const results = new Map();
	let resultsSource = null;
	const [resultsLink] = findLinks($, page.url, (t, h) => h.endsWith('.pdf') && key(t).startsWith('会議結果報告'));
	if (resultsLink) {
		const res = await get(resultsLink.href);
		resultsSource = { label: `${session.name} 会議結果報告`, url: res.url, fetchedAt: res.fetchedAt };
		const text = key(await pdfText(res.body));
		const list = text.slice(text.indexOf('議決結果番号件名'));
		for (const m of list.matchAll(RESULT)) {
			const date = m[3] ? `${s.year}-${m[3].padStart(2, '0')}-${m[4].padStart(2, '0')}` : null;
			if (!results.has(m[1])) results.set(m[1], { result: m[5], date });
		}
	}

	const billsPage = await get(billsLink.href);
	for (const l of findLinks(loadHtml(billsPage.body, billsPage.contentType), billsPage.url, (_, h) => h.endsWith('.pdf'))) {
		const m = stripFileNote(l.text).match(/^((?:議員提出)?第\s*\d+\s*号議案)\s*(.+)$/);
		if (!m || !inScope(m[2])) continue;
		const num = parseBillNumber(m[1]);
		if (!num || num.by === 'committee') continue;
		const official = m[2];
		const r = results.get(num.label);
		if (resultsSource && !r) warnings.push(`${num.label}: not in the 会議結果報告`);

		const res = await get(l.href);
		const text = await pdfText(res.body);
		const sources = [
			{ label: `${session.name} 議案`, url: billsPage.url, fetchedAt: billsPage.fetchedAt },
			{ label: `${num.label}（PDF）`, url: l.href, fetchedAt: res.fetchedAt }
		];
		if (r && resultsSource) sources.push(resultsSource);

		const out = outcome(r?.result ?? '', null, submittedDate(text), r?.date ?? null, { committeeUnknown: true });
		if (!out) {
			warnings.push(`${num.label}: unrecognised result 「${r?.result}」, skipped`);
			continue;
		}
		bills.push({
			facts: { id: billId(assembly.id, s, num.n, num.by), assembly: assembly.id, number: num.label, official, by: num.by, session: session.name, committee: null, ...out, sources },
			input: `【議案本文】\n${text}\n`
		});
	}
	return { bills, warnings };
}
