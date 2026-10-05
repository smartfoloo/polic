// 瑞穂町議会. A year page lists each session's 議案件名 page (「令和8年第1回瑞穂町議会定例会 議案件名」), with
// one table: 議案番号 | 件名 (bill PDF) | 結果. No committee or vote date is published, so committee is
// null and dates are the submission date from the PDF.

import { billId, inScope, outcome, parseBillNumber, stripFileNote, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '').replace('瑞穂町議会', '');

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
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === key(`${session.name}議案件名`));
	if (!link) return { bills, warnings: [`${session.name} is not on ${index.url}`] };
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);

	for (const tr of $('table tr').toArray()) {
		const tds = $(tr).children('td').toArray().map((td) => $(td));
		if (tds.length < 3) continue;
		const num = parseBillNumber(tds[0].text());
		const official = stripFileNote(tds[1].text());
		if (!num || !inScope(official)) continue;
		if (num.by === 'committee') {
			warnings.push(`${num.label} (committee bill) skipped: not supported yet`);
			continue;
		}
		const result = squash(tds[2].text());
		const sources = [{ label: `${session.name} 議案件名`, url: page.url, fetchedAt: page.fetchedAt }];
		let input = '';
		let submitted = null;
		const pdf = tds[1].find('a[href$=".pdf"]').attr('href');
		if (pdf) {
			const href = new URL(pdf, page.url).href;
			const res = await get(href);
			const text = await pdfText(res.body);
			submitted = submittedDate(text);
			input = `【議案本文】\n${text}\n`;
			sources.push({ label: `${num.label}（PDF）`, url: href, fetchedAt: res.fetchedAt });
		} else warnings.push(`${num.label}: no bill PDF found`);

		const out = outcome(result, null, submitted);
		if (!out) {
			warnings.push(`${num.label}: unrecognised result 「${result}」, skipped`);
			continue;
		}
		bills.push({
			facts: { id: billId(assembly.id, s, num.n, num.by), assembly: assembly.id, number: num.label, official, by: num.by, session: session.name, committee: null, ...out, sources },
			input
		});
	}
	return { bills, warnings };
}
