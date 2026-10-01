// 調布市議会. Year pages list each session's 市長提出予定議案 page (one PDF link per bill: 「議案第41号:title
// (PDF:62KB)」) and its 会議結果 page, where each bill is an h3 「41.title」 followed by a list:
// 付託委員会:総務委員会 (即決 = none) / 議決年月日:令和8年6月18日 / 結果:可決, under an h2 per kind
// (市長提出議案, 議員提出議案). Session names on the site add 調布市議会 (「令和8年第2回調布市議会定例会」).

import { billId, inScope, outcome, stripFileNote, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseReiwaDate, parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '').replace('調布市議会', '');

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
	const find = async (/** @type {string} */ url, /** @type {string} */ suffix) => {
		const page = await get(url);
		return findLinks(loadHtml(page.body, page.contentType), page.url, (t) => key(t) === key(session.name + suffix))[0];
	};

	// Results by kind and number, once the session has a 会議結果 page.
	/** @type {Map<string, { official: string, committee: string | null, result: string, voted: string | null }>} */
	const results = new Map();
	let resultsPage = null;
	const resultsLink = await find(resultsIndex.url, '会議結果');
	if (resultsLink) {
		resultsPage = await get(resultsLink.href);
		const $r = loadHtml(resultsPage.body, resultsPage.contentType);
		for (const h2 of $r('h2').toArray()) {
			const kind = /^市長提出議案/.test(key($r(h2).text())) ? 'head' : /^議員提出議案/.test(key($r(h2).text())) ? 'member' : null;
			if (!kind) continue;
			for (const h3 of $r(h2).nextUntil('h2', 'h3').toArray()) {
				const m = squash($r(h3).text()).normalize('NFKC').match(/^(\d+)\.\s*(.+)$/);
				if (!m) continue;
				/** @type {Record<string, string>} */
				const facts = {};
				$r(h3)
					.next('ul')
					.find('li')
					.each((_, li) => {
						const [k, ...v] = squash($r(li).text()).normalize('NFKC').split(':');
						facts[k] = v.join(':');
					});
				const c = facts['付託委員会'] ?? '';
				results.set(`${kind}${m[1]}`, { official: m[2], committee: /委員会$/.test(c) && !c.includes('・') ? c : null, result: facts['結果'] ?? '', voted: parseReiwaDate(facts['議決年月日'] ?? '') });
			}
		}
	}
	const resultsSource = resultsPage ? [{ label: `${session.name}会議結果`, url: resultsPage.url, fetchedAt: resultsPage.fetchedAt }] : [];

	const billsLink = await find(billsIndex.url, '市長提出予定議案');
	if (!billsLink) warnings.push(`No 市長提出予定議案 page for ${session.name}`);
	else {
		const page = await get(billsLink.href);
		for (const l of findLinks(loadHtml(page.body, page.contentType), page.url, (_, href) => href.endsWith('.pdf'))) {
			const m = stripFileNote(l.text).match(/^議案第(\d+)号:\s*(.+)$/);
			if (!m || !inScope(m[2])) continue;
			const n = Number(m[1]);
			const label = `議案第${n}号`;
			const r = results.get(`head${n}`);
			const res = await get(l.href);
			const text = await pdfText(res.body);
			const out = outcome(r?.result ?? '', r?.committee ?? null, submittedDate(text), r?.voted);
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
					sources: [{ label: `${session.name}市長提出予定議案`, url: page.url, fetchedAt: page.fetchedAt }, { label: `${label}（PDF）`, url: l.href, fetchedAt: res.fetchedAt }, ...resultsSource]
				},
				input: `【議案本文】\n${text}\n`
			});
		}
	}

	// Member ordinances: only on the results page; their text isn't linked from it, so title-only.
	for (const [k, r] of results) {
		if (!k.startsWith('member') || !inScope(r.official)) continue;
		const n = Number(k.slice(6));
		const out = outcome(r.result, r.committee, null, r.voted);
		if (!out) continue;
		warnings.push(`議員提出議案第${n}号 has no linked text: saved title-only`);
		bills.push({
			facts: { id: billId(assembly.id, s, n, 'member'), assembly: assembly.id, number: `議員提出議案第${n}号`, official: r.official, by: 'member', session: session.name, committee: r.committee, ...out, titleOnly: true, sources: resultsSource },
			input: ''
		});
	}
	return { bills, warnings };
}
