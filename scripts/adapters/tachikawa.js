// 立川市議会. A year page (令和8年の各定例会・臨時会の概要) links each session's page, which links its
// 議案一覧: one table per kind of bill with 番号 | 議案名 (bill PDF) | 付託委員会名 (付託省略 = none) |
// 議決年月日、結果 (「令和8年5月28日、可決」).

import { billId, inScope, outcome, parseBillNumber, stripFileNote, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName, squash } from '../lib/text.js';

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

	let sessionLink = null;
	for (const { url } of assembly.listPages) {
		const year = await get(url);
		[sessionLink] = findLinks(loadHtml(year.body, year.contentType), year.url, (t) => key(t) === key(session.name));
		if (sessionLink) break;
	}
	if (!sessionLink) return { bills, warnings: [`${session.name} is not on any of the listed year pages`] };
	const sessionPage = await get(sessionLink.href);
	const [listLink] = findLinks(loadHtml(sessionPage.body, sessionPage.contentType), sessionPage.url, (t) => key(t) === key(`${session.name}議案一覧`));
	if (!listLink) return { bills, warnings: [`No 議案一覧 link on ${sessionPage.url}`] };
	const page = await get(listLink.href);
	const $ = loadHtml(page.body, page.contentType);

	for (const table of $('table').toArray()) {
		const trs = $(table).find('tr').toArray();
		const headers = $(trs[0]).children().toArray().map((c) => key($(c).text()));
		const [cNum, cTitle, cCommittee, cResult] = ['番号', '議案名', '付託委員会名', '議決年月日、結果'].map((h) => headers.indexOf(h));
		if (cNum < 0 || cTitle < 0) continue;

		for (const tr of trs.slice(1)) {
			const tds = $(tr).children('td').toArray().map((td) => $(td));
			if (tds.length !== headers.length) continue;
			const num = parseBillNumber(tds[cNum].text());
			if (!num) continue;
			const official = stripFileNote(tds[cTitle].text());
			if (!inScope(official)) continue;
			if (num.by === 'committee') {
				warnings.push(`${num.label} (committee bill) skipped: not supported yet`);
				continue;
			}

			const committeeCell = cCommittee >= 0 ? key(tds[cCommittee].text()) : '';
			const committee = /委員会$/.test(committeeCell) ? committeeCell : null;
			const result = cResult >= 0 ? squash(tds[cResult].text()) : '';

			const sources = [{ label: `${session.name}議案一覧`, url: page.url, fetchedAt: page.fetchedAt }];
			let input = '';
			let submitted = null;
			const pdf = tds[cTitle].find('a[href$=".pdf"]').attr('href');
			if (pdf) {
				const href = new URL(pdf, page.url).href;
				const res = await get(href);
				const text = await pdfText(res.body);
				submitted = submittedDate(text);
				input = `【議案本文】\n${text}\n`;
				sources.push({ label: `${num.label}（PDF）`, url: href, fetchedAt: res.fetchedAt });
			} else {
				warnings.push(`${num.label}: no bill PDF found`);
			}

			const out = outcome(result, committee, submitted);
			if (!out) {
				warnings.push(`${num.label}: unrecognised result 「${result}」, skipped`);
				continue;
			}
			bills.push({
				facts: { id: billId(assembly.id, s, num.n, num.by), assembly: assembly.id, number: num.label, official, by: num.by, session: session.name, committee, ...out, sources },
				input
			});
		}
	}
	return { bills, warnings };
}
