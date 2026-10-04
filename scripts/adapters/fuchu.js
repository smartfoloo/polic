// 府中市議会. Mayor bills come from the city's 市長提出議案 page per session (year page → 「令和8年第2回定例会
// 市長提出議案」): one link per bill, 「第44号議案 title （PDF：80KB）」. Results come once the session closes
// from its 議決結果 page: a table per kind (caption 《市長提出議案》, 《議員提出議案》) with 番号 | 件名 |
// 付託委員会 (abbreviated; 本会議直接審議 = none) | 本会議結果. No vote date is published, so dates are the
// submission date from the PDF. Member bills appear only in the results table, with no text.

import { billId, inScope, outcome, stripFileNote, submittedDate } from '../lib/bills.js';
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

	// Results, when the session has closed: number → { committee, result } per kind.
	/** @type {Map<string, { committee: string | null, result: string, official: string }>} */
	const results = new Map();
	let resultsPage = null;
	const ri = await get(resultsIndex.url);
	const [resultsLink] = findLinks(loadHtml(ri.body, ri.contentType), ri.url, (t) => key(t) === key(`${session.name}議決結果`));
	if (resultsLink) {
		resultsPage = await get(resultsLink.href);
		const $r = loadHtml(resultsPage.body, resultsPage.contentType);
		for (const table of $r('table').toArray()) {
			const kind = key($r(table).find('caption').text()).includes('議員提出') ? 'member' : key($r(table).find('caption').text()).includes('市長提出') ? 'head' : null;
			if (!kind) continue;
			for (const tr of $r(table).find('tr').toArray().slice(1)) {
				const [num, title, committee, result] = $r(tr).children('td').toArray().map((td) => squash($r(td).text()));
				if (!num || !result) continue;
				const c = key(committee ?? '');
				results.set(`${kind}${Number(key(num))}`, { committee: c && c !== '本会議直接審議' ? `${c}委員会` : null, result: key(result), official: title });
			}
		}
	}
	const sourceOf = () => (resultsPage ? [{ label: `${session.name}議決結果`, url: resultsPage.url, fetchedAt: resultsPage.fetchedAt }] : []);

	const bi = await get(billsIndex.url);
	const [billsLink] = findLinks(loadHtml(bi.body, bi.contentType), bi.url, (t) => key(t) === key(`${session.name}市長提出議案`));
	if (!billsLink) return { bills, warnings: [`No 市長提出議案 page for ${session.name} on ${bi.url}`] };
	const page = await get(billsLink.href);
	for (const l of findLinks(loadHtml(page.body, page.contentType), page.url, (_, href) => href.endsWith('.pdf'))) {
		const m = stripFileNote(l.text).match(/^第(\d+)号議案\s*(.+)$/);
		if (!m || !inScope(m[2])) continue;
		const n = Number(m[1]);
		const label = `第${n}号議案`;
		const r = results.get(`head${n}`);
		const res = await get(l.href);
		const text = await pdfText(res.body);
		const out = outcome(r?.result ?? '', r?.committee ?? null, submittedDate(text), null, { committeeUnknown: !r });
		if (!out) {
			warnings.push(`${label}: unrecognised result 「${r?.result}」, skipped`);
			continue;
		}
		bills.push({
			facts: {
				id: billId(assembly.id, s, n, 'head'),
				assembly: assembly.id,
				number: label,
				official: m[2],
				by: 'head',
				session: session.name,
				committee: r?.committee ?? null,
				...out,
				sources: [{ label: `${session.name}市長提出議案`, url: page.url, fetchedAt: page.fetchedAt }, { label: `${label}（PDF）`, url: l.href, fetchedAt: res.fetchedAt }, ...sourceOf()]
			},
			input: `【議案本文】\n${text}\n`
		});
	}

	for (const [k, r] of results) {
		if (!k.startsWith('member') || !inScope(r.official)) continue;
		const n = Number(k.slice(6));
		const out = outcome(r.result, r.committee, null);
		if (!out) continue;
		warnings.push(`議員提出議案第${n}号 has no published text: saved title-only`);
		bills.push({
			facts: { id: billId(assembly.id, s, n, 'member'), assembly: assembly.id, number: `議員提出議案第${n}号`, official: r.official, by: 'member', session: session.name, committee: r.committee, ...out, titleOnly: true, sources: sourceOf() },
			input: ''
		});
	}
	return { bills, warnings };
}
