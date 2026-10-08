// 国分寺市議会. Bills come from the city's 提出議案一覧 page per session (「第2回定例会 提出議案一覧（令和8年5月25日議案
// 発送、…）」): a table per kind, 「議案第72号 title」 | a one-line 提案理由. Results come from the 審議結果 page, as a
// table or a PDF, one line per bill: 「議案第72号title 6月23日全員賛成・可決」, matched by number. No committees are published, and
// the 提案理由 is the only text, so bills are thin.

import { billId, inScope, outcome } from '../lib/bills.js';
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
	const [billsIndex, resultsIndex] = assembly.listPages;
	const year = key(session.name).match(/^令和(\d+|元)年/)?.[0] ?? '';
	const part = key(session.name).slice(year.length);

	const bi = await get(billsIndex.url);
	const [listLink] = findLinks(loadHtml(bi.body, bi.contentType), bi.url, (t) => key(t).startsWith(`${part}提出議案一覧(${year}`));
	if (!listLink) return { bills, warnings: [`${session.name} is not on ${bi.url} yet`] };
	const list = await get(listLink.href);
	const $ = loadHtml(list.body, list.contentType);

	// Results by bill label, once the 審議結果 page is up: a table on the page itself (第1回定例会) or a PDF.
	/** @type {Map<string, { title: string, result: string, voteDate: string }>} */
	const results = new Map();
	/** @type {import('../lib/fetch.js').FetchResult | null} */
	let resultsSource = null;
	const ri = await get(resultsIndex.url);
	const [resultLink] = findLinks(loadHtml(ri.body, ri.contentType), ri.url, (t) => key(t) === key(`${session.name}審議結果`));
	if (resultLink) {
		const page = await get(resultLink.href);
		const $r = loadHtml(page.body, page.contentType);
		/** @type {string[]} */
		let lines = [];
		const rows = $r('table tr')
			.toArray()
			.map((tr) => $r(tr).children('td, th').toArray().map((c) => squash($r(c).text())));
		const [pdfLink] = findLinks($r, page.url, (t) => key(t).startsWith(key(`${session.name}審議結果(PDF`)));
		if (rows.some((r) => key(r[0] ?? '') === '議案等番号')) {
			resultsSource = page;
			lines = rows.filter((r) => r.length === 3).map((r) => r.join(' '));
		} else if (pdfLink) {
			resultsSource = await get(pdfLink.href);
			lines = (await pdfText(resultsSource.body)).split('\n');
		} else warnings.push(`No 審議結果 on ${page.url} yet`);
		for (const line of lines) {
			const m = line.trim().match(/^((?:議員提出)?議案第\s*\d+\s*号)\s*(.*?)\s*(\d+)月(\d+)日(.+)$/);
			if (m) results.set(key(m[1]), { title: m[2], result: key(m[5]), voteDate: `${s.year}-${m[3].padStart(2, '0')}-${m[4].padStart(2, '0')}` });
		}
	}

	/** @type {{ label: string, official: string, reason: string }[]} */
	const found = [];
	for (const tr of $('table tr').toArray()) {
		const tds = $(tr).children('td').toArray();
		if (tds.length !== 2) continue;
		const m = squash($(tds[0]).text()).match(/^((?:議員提出)?議案第\s*\d+\s*号)\s*(.+)$/);
		if (m) found.push({ label: key(m[1]), official: m[2], reason: squash($(tds[1]).text()) });
	}
	// The city lists the mayor's bills only; member bills come from the results, title-only.
	for (const [label, r] of results) {
		if (label.startsWith('議員提出') && !found.some((f) => f.label === label)) found.push({ label, official: r.title, reason: '' });
	}

	for (const { label, official, reason } of found) {
		if (!inScope(official)) continue;
		const by = label.startsWith('議員提出') ? 'member' : 'head';
		const n = Number(label.match(/第(\d+)号/)?.[1]);
		const r = results.get(label);
		const out = outcome(r?.result ?? '', null, null, r?.voteDate ?? null, { committeeUnknown: true });
		if (!out) {
			warnings.push(`${label}: unrecognised result 「${r?.result}」, skipped`);
			continue;
		}
		bills.push({
			facts: {
				id: billId(assembly.id, s, n, by),
				assembly: assembly.id,
				number: label,
				official,
				by,
				session: session.name,
				committee: null,
				...out,
				...(reason ? {} : { titleOnly: true }),
				sources: [
					...(reason ? [{ label: `${session.name} 提出議案一覧`, url: list.url, fetchedAt: list.fetchedAt }] : []),
					...(r && resultsSource ? [{ label: `${session.name} 審議結果`, url: resultsSource.url, fetchedAt: resultsSource.fetchedAt }] : [])
				]
			},
			input: reason ? `【提案理由】\n${reason}\n` : ''
		});
	}
	return { bills, warnings };
}
