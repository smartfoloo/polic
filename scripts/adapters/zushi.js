// 逗子市議会. Two year pages (定例会, 臨時会) link one page per session, 「令和8年逗子市議会第2回定例会付議案件の
// 議案等と審議結果等」, with a table per kind (市長提出議案, 議員提出議案, …): 件名【担当課】 (「議案第32号」, a line
// break, then the title) | the bill PDF, or a 概要 paragraph for 諮問 and 報告 | 審議結果 (「令和8年6月23日原案可決
// 〈賛成多数〉」) | 付託先等 (「総務常任委員会付託」 or 本会議即決).

import { billId, inScope, outcome, parseBillNumber, submittedDate } from '../lib/bills.js';
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

	let link = null;
	for (const { url } of assembly.listPages) {
		const index = await get(url);
		[link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t.replace('逗子市議会', '')) === key(`${session.name}付議案件の議案等と審議結果等`));
		if (link) break;
	}
	if (!link) return { bills, warnings: [`${session.name} is not on any of the listed year pages`] };
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);

	for (const table of $('table').toArray()) {
		const rows = $(table).find('tr').toArray();
		const headers = $(rows[0]).children().toArray().map((c) => key($(c).text()));
		const [cTitle, cText, cResult, cCommittee] = [0, 1, headers.indexOf('審議結果'), headers.indexOf('付託先等')];
		if (cResult < 0) continue;

		for (const tr of rows.slice(1)) {
			const tds = $(tr).children('td').toArray().map((td) => $(td));
			if (tds.length !== headers.length) continue;
			// The number and the title are split by a line break; the responsible section follows the title.
			const [head, ...rest] = tds[cTitle]
				.html()
				?.split(/<br\s*\/?>/i)
				.map((part) => squash($('<div>').html(part).text())) ?? [''];
			const num = parseBillNumber(head);
			const official = squash(rest.join(' ')).replace(/\s*【[^】]*】$/, '');
			if (!num || !inScope(official)) continue;
			if (num.by === 'committee') {
				warnings.push(`${num.label} (committee bill) skipped: not supported yet`);
				continue;
			}

			const committee = key(tds[cCommittee]?.text() ?? '').match(/^(.+委員会)付託$/)?.[1] ?? null;
			const result = squash(tds[cResult].text());
			const sources = [{ label: `${session.name} 付議案件と審議結果`, url: page.url, fetchedAt: page.fetchedAt }];
			let input = '';
			let submitted = null;
			const pdf = tds[cText].find('a[href$=".pdf"]').attr('href');
			if (pdf) {
				const href = new URL(pdf, page.url).href;
				const res = await get(href);
				const text = await pdfText(res.body);
				submitted = submittedDate(text);
				input = `【議案本文】\n${text}\n`;
				sources.push({ label: `${num.label}（PDF）`, url: href, fetchedAt: res.fetchedAt });
			} else warnings.push(`${num.label}: no bill PDF found`);

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
