// 品川区議会. Each session has a 提出議案 page: one table row per bill with its PDF, a 内容等 gist
// (what changes, 施行期日) and the plenary result. No vote date is published there, so dates are the
// submission date from the PDF. Committees come from the current 委員会 pages, which list the bills each
// one reviewed (they cover May to May, so earlier sessions get no committee; they are closed anyway).

import { billId, inScope, statusFrom, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml, tableRows } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName, squash, titleKey } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */
/** @typedef {(url: string) => Promise<import('../lib/fetch.js').FetchResult>} Get */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');

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

	const index = await get(assembly.listPages[0].url);
	const [sessionLink] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === `${key(session.name)}本会議`);
	if (!sessionLink) return { bills, warnings: [`${session.name} is not listed on ${index.url}`] };
	const sessionPage = await get(sessionLink.href);
	const [listLink] = findLinks(loadHtml(sessionPage.body, sessionPage.contentType), sessionPage.url, (t) => t.startsWith('提出議案'));
	if (!listLink) return { bills, warnings: [`No 提出議案 page for ${session.name} yet`] };
	const list = await get(listLink.href);
	const $ = loadHtml(list.body, list.contentType);

	const referred = await committeeBills(assembly, get);

	// One table per kind (条例議案, 契約議案, …, 議員提案): 番号 | 議案名 | 内容等 | 結果
	for (const table of $('table').toArray()) {
		const rows = tableRows($, table, list.url);
		const headers = rows[0]?.map((c) => key(c.text)) ?? [];
		const [cNum, cTitle, cGist, cResult] = ['番号', '議案名', '内容等', '結果'].map((h) => headers.indexOf(h));
		if (cNum < 0 || cTitle < 0) continue;

		for (const row of rows.slice(1)) {
			const label = key(row[cNum]?.text ?? '');
			const m = label.match(/^(議員提出)?第(\d+)号議案$/);
			if (!m) continue;
			const official = squash(row[cTitle].text.normalize('NFKC').replace(/\(\.pdf[^)]*\)$/, ''));
			if (!inScope(official)) continue;
			const by = m[1] ? 'member' : 'head';
			const n = Number(m[2]);

			// Numbers restart each January but the committee pages run May to May: match the title too.
			const committee = by === 'head' ? (referred.find((r) => r.n === n && r.key.startsWith(titleKey(official)))?.committee ?? null) : null;
			const result = cResult >= 0 ? (row[cResult]?.text ?? '') : '';
			const st = statusFrom(result, committee !== null);
			if (!st) {
				warnings.push(`${label}: unrecognised result 「${result}」, skipped`);
				continue;
			}

			const sources = [{ label: `${session.name} 提出議案`, url: list.url, fetchedAt: list.fetchedAt }];
			const gist = cGist >= 0 ? (row[cGist]?.text ?? '') : '';
			let input = gist ? `【概要】\n${gist}\n` : '';
			let submitted = null;
			// The PDF is the title cell's first link (a .doc/.docx copy may follow).
			const href = row[cTitle].href;
			if (href?.endsWith('.pdf')) {
				const res = await get(href);
				const text = await pdfText(res.body);
				submitted = submittedDate(text);
				input += `\n【議案本文】\n${text}\n`;
				sources.push({ label: `${label}（PDF）`, url: href, fetchedAt: res.fetchedAt });
			} else {
				warnings.push(`${label}: no bill PDF found`);
			}

			bills.push({
				facts: {
					id: billId(assembly.id, s, n, by),
					assembly: assembly.id,
					number: label,
					official,
					by,
					session: session.name,
					committee,
					...st,
					dateKind: '提案',
					date: submitted,
					sources
				},
				input
			});
		}
	}
	return { bills, warnings };
}

/**
 * Bills each current committee has reviewed: its page lists 「○第６４号議案 <title>（.pdf…）」 under 議案審査.
 * @param {import('../../src/lib/config/assemblies.js').Assembly} assembly
 * @param {Get} get
 */
async function committeeBills(assembly, get) {
	/** @type {{ n: number, key: string, committee: string }[]} */
	const found = [];
	for (const { url } of assembly.listPages.slice(1)) {
		const page = await get(url);
		const $ = loadHtml(page.body, page.contentType);
		const committee = key($('h2').last().text());
		for (const tr of $('tr').toArray()) {
			const cells = $(tr).children('td').toArray().map((td) => $(td).text().normalize('NFKC'));
			if (!cells.some((c) => c.trim() === '議案審査')) continue;
			for (const m of cells.join(' ').matchAll(/○第(\d+)号議案\s*([^○]+)/g)) {
				found.push({ n: Number(m[1]), key: titleKey(m[2].replace(/\(\.pdf[^)]*\)/, '')), committee });
			}
		}
	}
	return found;
}
