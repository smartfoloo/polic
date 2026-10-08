// 湯河原町議会. The 本会議審議議案 index links a page per year; each session on it is an h2 「令和8年第4回定例会
// （令和8年9月1日～令和8年9月29日）」 and a table 議案番号 (「37」) | 件名 → PDF | 付託先委員会 (「-」 = none) | 結果.
// A table can sit before its own heading, in which case its caption names the session. No vote dates. Member
// bills are on a separate page, not collected yet.

import { billId, inScope, outcome, stripFileNote, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/[\s​]+/g, '');

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

	const index = await get(assembly.listPages[0].url);
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === `令和${s.year - 2018}年`);
	if (!link) return { bills, warnings: [`No 令和${s.year - 2018}年 page on ${index.url}`] };
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);

	let heading = '';
	/** @type {any} */
	let table = null;
	for (const el of $('h2, table').toArray()) {
		if (el.tagName === 'h2') {
			heading = key($(el).text());
			continue;
		}
		const caption = key($(el).find('caption').text());
		const label = caption.startsWith('令和') ? caption : heading;
		if (label.startsWith(`${key(session.name)}(`) && key($(el).find('tr').first().text()).startsWith('議案番号')) {
			table = el;
			break;
		}
	}
	if (!table) return { bills, warnings: [`No table for ${session.name} on ${page.url}`] };

	for (const tr of $(table).find('tr').toArray().slice(1)) {
		const tds = $(tr).children('td').toArray().map((td) => $(td));
		if (tds.length < 4) continue;
		const n = Number(key(tds[0].text()));
		const official = stripFileNote(tds[1].text());
		if (!n || !inScope(official)) continue;
		const label = `議案第${n}号`;
		const committeeCell = key(tds[2].text());
		const committee = /委員会$/.test(committeeCell) ? committeeCell : null;
		const result = squash(tds[3].text());

		const sources = [{ label: `本会議審議議案（令和${s.year - 2018}年）`, url: page.url, fetchedAt: page.fetchedAt }];
		let input = '';
		let submitted = null;
		const pdf = tds[1].find('a[href$=".pdf"]').attr('href');
		if (pdf) {
			const href = new URL(pdf, page.url).href;
			const res = await get(href);
			const text = await pdfText(res.body);
			submitted = submittedDate(text);
			input = `【議案本文】\n${text}\n`;
			sources.push({ label: `${label}（PDF）`, url: href, fetchedAt: res.fetchedAt });
		} else warnings.push(`${label}: no bill PDF found`);

		const out = outcome(result, committee, submitted);
		if (!out) {
			warnings.push(`${label}: unrecognised result 「${result}」, skipped`);
			continue;
		}
		bills.push({
			facts: { id: billId(assembly.id, s, n, 'head'), assembly: assembly.id, number: label, official, by: 'head', session: session.name, committee, ...out, sources },
			input
		});
	}
	return { bills, warnings };
}
