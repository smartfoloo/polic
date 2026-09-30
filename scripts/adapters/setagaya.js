// 世田谷区議会. Everything is on the ward's own site:
// - 議案一覧 per session (linked from 議案・委員会資料): the ward's bills, one PDF each.
// - After a session, its 「…の結果」 page links 議決内容 (vote dates, a one-line gist per bill) and
//   賛否一覧 (committee, result).
// - During a session, 「…審議予定案件及び審議結果等」 on the 区議会 top page: committee, vote date, result so far.
// Member bills appear only in the result tables, with no text: title only (as in Tokyo).

import { billId, inScope, statusFrom, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml, tableRows } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */
/** @typedef {import('../lib/bills.js').Source} Source */
/** @typedef {(url: string) => Promise<import('../lib/fetch.js').FetchResult>} Get */
/** @typedef {{ official: string, committee: string | null, result: string, date: string | null, gist: string }} Outcome */

// Page titles say 「令和8年第2回区議会定例会」 where the session list says 「令和8年第2回定例会」.
const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '').replace('区議会', '');

/** 議案第63号 (head) · 議員提出議案第1号 (member); 専決, 認定, 同意 etc. aren't bills we cover. */
function parseNumber(/** @type {string} */ text) {
	const m = key(text).match(/^(議員提出)?議案第(\d+)号/);
	return m ? { by: /** @type {'head' | 'member'} */ (m[1] ? 'member' : 'head'), n: Number(m[2]), label: m[0] } : null;
}

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

	// The ward's bills and their PDFs.
	const index = await get(assembly.listPages[0].url);
	const [listLink] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === `${key(session.name)}議案一覧`);
	/** @type {Map<string, { official: string, pdf: string | null }>} */
	const listed = new Map();
	/** @type {Source[]} */
	const listSources = [];
	if (listLink) {
		const list = await get(listLink.href);
		const $ = loadHtml(list.body, list.contentType);
		for (const li of $('li').toArray()) {
			const num = parseNumber($(li).text());
			if (!num) continue;
			const a = $(li).find('a[href$=".pdf"]').first();
			const official = squash(a.length ? a.text() : $(li).text().normalize('NFKC').replace(num.label, '')).replace(/（PDF[^）]*）$/, '');
			listed.set(num.label, { official, pdf: a.length ? new URL(/** @type {string} */ (a.attr('href')), list.url).href : null });
		}
		listSources.push({ label: `${session.name} 議案一覧`, url: list.url, fetchedAt: list.fetchedAt });
	} else {
		warnings.push(`No 議案一覧 for ${session.name} on ${index.url}`);
	}

	const outcomes = (await closedResults(assembly, session, s.year, get)) ?? (await openResults(assembly, session, s.year, get));
	if (!outcomes) warnings.push(`No results page for ${session.name} yet; bills stay pending`);

	const labels = new Set([...listed.keys(), ...(outcomes?.byNumber.keys() ?? [])]);
	for (const label of labels) {
		const num = /** @type {NonNullable<ReturnType<typeof parseNumber>>} */ (parseNumber(label));
		const item = listed.get(label);
		const outcome = outcomes?.byNumber.get(label);
		const official = item?.official ?? outcome?.official ?? '';
		if (!inScope(official)) continue;
		if (num.by === 'head' && !item) warnings.push(`${label}: in the results but not in the 議案一覧`);
		if (outcomes && !outcome) warnings.push(`${label}: not in the results yet`);

		const committee = outcome?.committee ?? null;
		const st = statusFrom(outcome?.result ?? '', committee !== null);
		if (!st) {
			warnings.push(`${label}: unrecognised result 「${outcome?.result}」, skipped`);
			continue;
		}

		const sources = [...listSources, ...(outcomes?.sources ?? [])];
		let input = outcome?.gist ? `【概要】\n${outcome.gist}\n` : '';
		let submitted = null;
		if (item?.pdf) {
			const res = await get(item.pdf);
			const text = await pdfText(res.body);
			submitted = submittedDate(text);
			input += `\n【議案本文】\n${text}\n`;
			sources.push({ label: `${label}（PDF）`, url: item.pdf, fetchedAt: res.fetchedAt });
		} else if (num.by === 'head') {
			warnings.push(`${label}: no bill PDF found`);
		}

		const voted = st.stage === 3 ? (outcome?.date ?? null) : null;
		bills.push({
			facts: {
				id: billId(assembly.id, s, num.n, num.by),
				assembly: assembly.id,
				number: label,
				official,
				by: num.by,
				session: session.name,
				committee,
				...st,
				...(num.by === 'member' ? { titleOnly: true } : {}),
				dateKind: voted ? (st.status === '否決' ? '否決' : '可決') : '提案',
				date: voted ?? submitted,
				sources
			},
			input
		});
	}
	return { bills, warnings };
}

/** 「9月29日」 or 「6月19日議決分」 → ISO date in the session's year. */
function monthDay(/** @type {string} */ text, /** @type {number} */ year) {
	const m = text.normalize('NFKC').match(/(\d+)月(\d+)日/);
	return m ? `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
}

/**
 * A closed session: 賛否一覧 for committee and result, 議決内容 for vote dates and gists.
 * @param {import('../../src/lib/config/assemblies.js').Assembly} assembly
 * @param {import('../../src/lib/config/assemblies.js').Session} session
 * @param {number} year
 * @param {Get} get
 */
async function closedResults(assembly, session, year, get) {
	const index = await get(assembly.listPages[1].url);
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t).startsWith(key(session.name)) && t.endsWith('の結果'));
	if (!link) return null;
	const top = await get(link.href);
	const $t = loadHtml(top.body, top.contentType);
	const [votesLink] = findLinks($t, top.url, (t) => t === '賛否一覧');
	const [detailsLink] = findLinks($t, top.url, (t) => t === '議決内容');
	if (!votesLink || !detailsLink) return null;
	// The 委員会名称 legend gives full names: 「企画＝企画総務常任委員会」.
	const committees = [...$t('body').text().normalize('NFKC').matchAll(/=\s*(\S+委員会)/g)].map((m) => m[1]);

	/** @type {Map<string, Outcome>} */
	const byNumber = new Map();
	const votes = await get(votesLink.href);
	const $v = loadHtml(votes.body, votes.contentType);
	// 委員会 | 議案番号 | 件名 | 賛否 | 審議結果, with the committee cell spanning its bills' rows.
	let short = '';
	for (const row of tableRows($v, $v('table').first(), votes.url).map((r) => r.map((c) => c.text))) {
		if (row.length === 5) short = row[0];
		else if (row.length !== 4) continue;
		const [numText, title, , result] = row.slice(-4);
		const num = parseNumber(numText);
		if (!num) continue;
		const committee = short === '付託省略' ? null : (committees.find((c) => key(c).startsWith(key(short))) ?? null);
		byNumber.set(num.label, { official: title, committee, result, date: null, gist: '' });
	}

	const details = await get(detailsLink.href);
	const $d = loadHtml(details.body, details.contentType);
	let date = null;
	for (const el of $d('h2, li').toArray()) {
		if (el.tagName === 'h2') {
			date = monthDay($d(el).text(), year);
			continue;
		}
		const outcome = byNumber.get(parseNumber($d(el).text())?.label ?? '');
		if (!outcome) continue;
		outcome.date = date;
		// 「議案第43号 <title><br><gist>」
		let afterBreak = false;
		for (const node of $d(el).contents().toArray()) {
			if (node.type === 'tag' && node.tagName === 'br') afterBreak = true;
			else if (afterBreak) outcome.gist += $d(node).text();
		}
		outcome.gist = squash(outcome.gist);
	}

	/** @type {Source[]} */
	const sources = [
		{ label: `${session.name} 議決内容`, url: details.url, fetchedAt: details.fetchedAt },
		{ label: `${session.name} 議案賛否一覧表`, url: votes.url, fetchedAt: votes.fetchedAt }
	];
	return { byNumber, sources };
}

/**
 * A session in progress: the 審議予定案件 table (議案番号 | 件名 | 付託先 | 議決日 | 結果).
 * @param {import('../../src/lib/config/assemblies.js').Assembly} assembly
 * @param {import('../../src/lib/config/assemblies.js').Session} session
 * @param {number} year
 * @param {Get} get
 */
async function openResults(assembly, session, year, get) {
	const index = await get(assembly.listPages[2].url);
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t).startsWith(key(session.name)) && t.includes('審議予定案件'));
	if (!link) return null;
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);
	const table = $('table').toArray().find((t) => squash($(t).find('caption').text()) === '議案一覧');
	if (!table) return null;

	/** @type {Map<string, Outcome>} */
	const byNumber = new Map();
	for (const row of tableRows($, table, page.url).map((r) => r.map((c) => c.text))) {
		const num = parseNumber(row[0] ?? '');
		if (!num || row.length < 5) continue;
		const [, title, referred, voted, result] = row;
		byNumber.set(num.label, {
			official: title,
			committee: referred && referred !== '付託省略' ? referred : null,
			result,
			date: result ? monthDay(voted, year) : null,
			gist: ''
		});
	}
	/** @type {Source[]} */
	const sources = [{ label: `${session.name} 審議予定案件及び審議結果等`, url: page.url, fetchedAt: page.fetchedAt }];
	return { byNumber, sources };
}
