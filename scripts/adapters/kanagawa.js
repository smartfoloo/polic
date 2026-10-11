// 神奈川県議会. The 「提案された議案及び審議結果」 index links a page per session (「令和8年第2回定例会」 → gian_08dai2.html).
// That page has a results table, 案番号 | 議案名 | 議決日 | 審議結果 | one column per 会派, filled in as votes are taken,
// and links bundles of bill texts per send date: 「令和8年第2回神奈川県議会定例会議案（条例その他その4）（PDF…）」. Each
// bundle opens with a scrambled table of contents (「定県第 52 号議案」, spaced); each bill's pages end with a
// 「定県第52号議案」 tab (unspaced) and its title as vertical label lines. A bill's text is the run between tabs,
// starting where its title appears verbatim. Bills not yet voted on are only in the bundles, so their titles come
// from the table of contents. Committees are in 議案付託表 PDFs, some of which extract as garbled text, so they
// aren't read.

import { billId, inScope, outcome, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml, tableGrid } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');
// A tab line; two can run together (「定県第59号議案定県第70号議案」, 「定県第定県第187号議案」), and the last number
// is the page's own.
const TAB = /^(?:定県第|\d+号議案)+$/;
const tabNumber = (/** @type {string} */ l) => Number([...l.matchAll(/(\d+)号議案/g)].at(-1)?.[1]);

/**
 * Bills in one bundle: number → { title from the table of contents, text }.
 * @param {string} text
 */
function splitBundle(text) {
	const lines = text.split('\n').map((l) => l.trim());
	const firstTab = lines.findIndex((l) => TAB.test(l) && l.startsWith('定県第'));
	/** @type {Map<number, { tocTitle: string, chunk: string }>} */
	const out = new Map();
	if (firstTab < 0) return out;

	// Table of contents: everything up to its last spaced 「定県第 N 号議案」, title lines before each.
	const head = lines.slice(0, firstTab).join('\n');
	const last = [...head.matchAll(/定県第\s+\d+\s+号議案/g)].at(-1);
	const parts = last ? head.slice(0, last.index + last[0].length).split(/定県第\s+(\d+)\s+号議案/) : [];
	/** @type {Map<number, string>} */
	const toc = new Map();
	for (let i = 1; i < parts.length; i += 2) {
		const title = parts[i - 1]
			.split('\n')
			.filter((l) => l && !/^(\d+|ページ件名番号|目次|令和.*議案|[(（].*[)）])$/.test(l))
			.map((l) => l.replace(/^\d+/, ''))
			.join('');
		toc.set(Number(parts[i]), title);
	}

	// Body: the text before each tab belongs to that bill, starting after the table of contents (whose titles would
	// otherwise match first).
	let from = lines.findLastIndex((l, i) => i < firstTab && /定県第\s+\d+\s+号議案/.test(l)) + 1;
	lines.forEach((l, i) => {
		if (!TAB.test(l) || !l.startsWith('定県第')) return;
		const n = tabNumber(l);
		const chunk = lines.slice(from, i).join('\n');
		out.set(n, { tocTitle: toc.get(n) ?? '', chunk: (out.get(n)?.chunk ?? '') + chunk });
		from = i + 1;
	});
	return out;
}

/**
 * The bill's own text: the chunk from where `title` appears verbatim. A title from the scrambled table of contents
 * may carry another entry in front, so shorter tails (cut after 「）」) are tried too.
 * @param {string} chunk
 * @param {string} title
 * @returns {{ official: string, text: string } | null}
 */
function locate(chunk, title) {
	const k = key(chunk);
	const tails = [title, ...[...title.matchAll(/[)）]/g)].map((m) => title.slice(/** @type {number} */ (m.index) + 1))];
	for (const t of tails.map(key).filter((t) => t.length >= 8)) {
		const at = k.indexOf(t);
		if (at >= 0) return { official: t, text: k.slice(at) };
	}
	return null;
}

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
	const year = key(session.name).match(/^令和\d+年/)?.[0] ?? '';
	// The newest session is linked with its year (「令和8年第3回定例会」), earlier ones without (「第2回定例会」) under it.
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === key(session.name)).concat(
		findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === key(session.name).slice(year.length)).filter(
			(l) => l.href.includes(`gian_${String(s.year - 2018).padStart(2, '0')}dai`)
		)
	);
	if (!link) return { bills, warnings: [`${session.name} is not on ${index.url} yet`] };
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);

	// Results so far, by label: 定県第44号議案 / 議員提出議案第1号.
	/** @type {Map<string, { title: string, result: string, voteDate: string | null }>} */
	const results = new Map();
	for (const table of $('table').toArray()) {
		for (const [label, title, day, result] of tableGrid($, table)) {
			const d = key(day ?? '').match(/^(\d+)月(\d+)日$/);
			const voteDate = d ? `${s.year}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}` : null;
			if (/^(定県第\d+号議案|議員提出議案第\d+号)$/.test(key(label ?? ''))) results.set(key(label), { title, result: key(result ?? ''), voteDate });
		}
	}

	// Head bills' texts, from the 条例その他 bundles (budgets are out of scope).
	/** @type {Map<number, { tocTitle: string, chunk: string, source: import('../lib/fetch.js').FetchResult }>} */
	const texts = new Map();
	for (const b of findLinks($, page.url, (t) => /定例会議案\((令和\d+年度)?条例/.test(key(t)))) {
		const pdf = await get(b.href);
		for (const [n, v] of splitBundle(await pdfText(pdf.body))) texts.set(n, { ...v, source: pdf });
	}

	const numbers = new Set([
		...[...results.keys()].filter((l) => l.startsWith('定県')).map((l) => Number(l.match(/\d+/)?.[0])),
		...texts.keys()
	]);
	for (const n of [...numbers].sort((a, b) => a - b)) {
		const label = `定県第${n}号議案`;
		const r = results.get(label);
		const t = texts.get(n);
		const found = t ? locate(t.chunk, r?.title ?? t.tocTitle) : null;
		const official = r?.title ?? found?.official ?? (t?.tocTitle ? key(t.tocTitle) : undefined);
		if (!official) {
			warnings.push(`${label}: no title in the results or the bundle's contents, skipped`);
			continue;
		}
		if (!inScope(official)) continue;
		if (t && !found) warnings.push(`${label}: title not found in its bundle text, title-only`);
		if (!t) warnings.push(`${label}: not in this session's bundles (carried over?), title-only`);
		const out = outcome(r?.result ?? '', null, found ? submittedDate(found.text) : null, r?.voteDate ?? null, { committeeUnknown: true });
		if (!out) {
			warnings.push(`${label}: unrecognised result 「${r?.result}」, skipped`);
			continue;
		}
		bills.push({
			facts: {
				id: billId(assembly.id, s, n, 'head'),
				assembly: assembly.id,
				number: label,
				official,
				by: 'head',
				session: session.name,
				committee: null,
				...out,
				...(found ? {} : { titleOnly: true }),
				sources: [
					...(found && t ? [{ label: `${label}（PDF）`, url: t.source.url, fetchedAt: t.source.fetchedAt }] : []),
					...(r ? [{ label: `${session.name} 審議結果`, url: page.url, fetchedAt: page.fetchedAt }] : [])
				]
			},
			input: found ? `【議案本文】\n${found.text}\n` : ''
		});
	}

	// Member bills: title and result only; their texts aren't published with the bundles.
	for (const [label, r] of results) {
		const m = label.match(/^議員提出議案第(\d+)号$/);
		if (!m || !inScope(r.title)) continue;
		const n = Number(m[1]);
		const out = outcome(r.result, null, null, r.voteDate, { committeeUnknown: true });
		if (!out) {
			warnings.push(`${label}: unrecognised result 「${r.result}」, skipped`);
			continue;
		}
		bills.push({
			facts: {
				id: billId(assembly.id, s, n, 'member'),
				assembly: assembly.id,
				number: label,
				official: r.title,
				by: 'member',
				session: session.name,
				committee: null,
				...out,
				titleOnly: true,
				sources: [{ label: `${session.name} 審議結果`, url: page.url, fetchedAt: page.fetchedAt }]
			},
			input: ''
		});
	}
	return { bills, warnings };
}
