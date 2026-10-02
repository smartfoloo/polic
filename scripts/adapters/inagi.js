// 稲城市議会. The year page (令和8年 議会の動き) links one page per session (「令和8年第2回稲城市議会定例会」)
// holding everything: a table No | 議案番号 (「第27号議案」) | 議案名 | 審議方法 (committee, or 即決) | 議決年月日 |
// 議決結果, posted as the session closes, and 議案書 PDFs with every mayor bill.

import { billId, inScope, outcome, parseBillNumber, splitBills, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml, tableGrid } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseReiwaDate, parseSessionName, squash } from '../lib/text.js';

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
		[sessionLink] = findLinks(loadHtml(year.body, year.contentType), year.url, (t) => key(t) === `令和${s.year - 2018}年第${s.n}回稲城市議会${s.kind}`);
		if (sessionLink) break;
	}
	if (!sessionLink) return { bills, warnings: [`${session.name} is not on any of the listed year pages`] };
	const page = await get(sessionLink.href);
	const $ = loadHtml(page.body, page.contentType);

	const table = $('table')
		.toArray()
		.find((t) => tableGrid($, t)[0]?.map(key).includes('議案番号'));
	if (!table) {
		if (session.closes < new Date().toISOString().slice(0, 10)) return { bills, warnings: [`${session.name} has closed but its bill table isn't posted yet`] };
		return { bills, warnings: [`No bill table on ${page.url} yet`] };
	}

	/** @type {Map<number, string>} */
	const texts = new Map();
	/** @type {Map<number, { url: string, fetchedAt: string }>} */
	const textSource = new Map();
	for (const l of findLinks($, page.url, (t, h) => h.endsWith('.pdf') && t.includes('議案書'))) {
		const res = await get(l.href);
		for (const [n, text] of splitBills(await pdfText(res.body))) {
			texts.set(n, text);
			textSource.set(n, { url: l.href, fetchedAt: res.fetchedAt });
		}
	}

	const [header, ...rows] = tableGrid($, table);
	const [cNum, cTitle, cHow, cDate, cResult] = ['議案番号', '議案名', '審議方法', '議決年月日', '議決結果'].map((h) => header.map(key).indexOf(h));
	for (const row of rows) {
		const num = parseBillNumber(row[cNum] ?? '');
		const official = squash(row[cTitle] ?? '');
		if (!num || !inScope(official)) continue;
		if (num.by === 'committee') {
			warnings.push(`${num.label} (committee bill) skipped: not supported yet`);
			continue;
		}
		const how = key(row[cHow] ?? '');
		const committee = how.endsWith('委員会') ? how : null;
		const sources = [{ label: session.name, url: page.url, fetchedAt: page.fetchedAt }];

		const text = num.by === 'head' ? (texts.get(num.n) ?? '') : '';
		const src = textSource.get(num.n);
		if (text && src) sources.push({ label: `${num.label}（PDF）`, ...src });
		else if (num.by === 'head') warnings.push(`${num.label}: not found in the 議案書`);

		const out = outcome(key(row[cResult] ?? ''), committee, text ? submittedDate(text) : null, parseReiwaDate(row[cDate] ?? ''));
		if (!out) {
			warnings.push(`${num.label}: unrecognised result 「${row[cResult]}」, skipped`);
			continue;
		}
		bills.push({
			facts: {
				id: billId(assembly.id, s, num.n, num.by),
				assembly: assembly.id,
				number: num.label,
				official,
				by: num.by,
				session: session.name,
				committee,
				...out,
				sources,
				...(text ? {} : { titleOnly: true })
			},
			input: text ? `【議案本文】\n${text}\n` : ''
		});
	}
	return { bills, warnings };
}
