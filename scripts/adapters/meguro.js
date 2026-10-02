// 目黒区議会. Bills are 議案第N号 in one sequence (member bills included); the PDF's 提出者 tells them apart.
// - 本会議の資料: year page → 「令和8年第2回定例会の資料」 → one PDF per bill, 「議案第46号 title（PDF：56KB）」.
//   Posted after the session closes.
// - 本会議の議決結果: year page → 「令和8年第2回定例会の議決結果」 → one table per voting day under an h2
//   「令和8年6月19日議決」, rows 「議案第46号 title」 | 結果.
// - 議会日程・傍聴: only the current session's page (「令和8年第3回目黒区議会定例会の開催」) lists committees, as
//   h3 committee + ul of titles. Earlier sessions have no committee.

import { billId, inScope, outcome, stripFileNote, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseReiwaDate, parseSessionName, stripCjkSpaces } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');

/**
 * Index page → 「令和8年」 → the session's page whose link text is `title`.
 * @param {(url: string) => Promise<import('../lib/fetch.js').FetchResult>} get
 * @param {string} indexUrl
 * @param {number} year
 * @param {string} title
 */
async function sessionPage(get, indexUrl, year, title) {
	const index = await get(indexUrl);
	const [yearLink] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === `令和${year - 2018}年`);
	if (!yearLink) return null;
	const yearPage = await get(yearLink.href);
	const [link] = findLinks(loadHtml(yearPage.body, yearPage.contentType), yearPage.url, (t) => key(t) === title);
	return link ? get(link.href) : null;
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
	const [textsIndex, resultsIndex, scheduleIndex] = assembly.listPages;
	const name = key(session.name);

	const texts = await sessionPage(get, textsIndex.url, s.year, `${name}の資料`);
	if (!texts) return { bills, warnings: [`No 資料 page for ${session.name} yet`] };

	/** @type {Map<number, { result: string, date: string | null }>} */
	const results = new Map();
	const resultsPage = await sessionPage(get, resultsIndex.url, s.year, `${name}の議決結果`);
	if (resultsPage) {
		const $r = loadHtml(resultsPage.body, resultsPage.contentType);
		for (const table of $r('table').toArray()) {
			const date = parseReiwaDate($r(table).prevAll('h2').first().text());
			for (const tr of $r(table).find('tr').toArray()) {
				const [label, result] = $r(tr).children('td').toArray().map((td) => key($r(td).text()));
				const m = label?.match(/^議案第(\d+)号/);
				if (m) results.set(Number(m[1]), { result, date });
			}
		}
	} else if (session.closes < new Date().toISOString().slice(0, 10)) {
		return { bills, warnings: [`${session.name} has closed but its 議決結果 isn't posted yet`] };
	}

	/** @type {Map<string, string>} title → committee, while the session is current */
	const committees = new Map();
	const si = await get(scheduleIndex.url);
	const [scheduleLink] = findLinks(loadHtml(si.body, si.contentType), si.url, (t) => key(t) === `${name.replace(/(第\d+回)/, '$1目黒区議会')}の開催`);
	if (scheduleLink) {
		const page = await get(scheduleLink.href);
		const $s = loadHtml(page.body, page.contentType);
		$s('h3').each((_, h) => {
			const committee = key($s(h).text());
			if (!committee.endsWith('委員会')) return;
			$s(h).next('ul').find('li').each((_, li) => void committees.set(key($s(li).text()), committee));
		});
	}

	for (const l of findLinks(loadHtml(texts.body, texts.contentType), texts.url, (_, href) => href.endsWith('.pdf'))) {
		const m = stripFileNote(l.text).match(/^議案第\s*(\d+)\s*号\s*(.+)$/);
		if (!m || !inScope(m[2])) continue;
		const n = Number(m[1]);
		const official = m[2];
		const number = `議案第${n}号`;

		const res = await get(l.href);
		const text = await pdfText(res.body);
		const submitter = stripCjkSpaces(text).match(/提出者\s*(\S+)/)?.[1] ?? '';
		const by = /議会議員/.test(submitter) ? 'member' : /委員会|委員長/.test(submitter) ? 'committee' : 'head';
		if (by === 'committee') {
			warnings.push(`${number} (committee bill) skipped: not supported yet`);
			continue;
		}

		const committee = committees.get(key(official)) ?? null;
		const r = results.get(n);
		if (resultsPage && !r) warnings.push(`${number}: not on the 議決結果 page`);
		const sources = [{ label: `${session.name}の資料`, url: texts.url, fetchedAt: texts.fetchedAt }];
		sources.push({ label: `${number}（PDF）`, url: l.href, fetchedAt: res.fetchedAt });
		if (resultsPage) sources.push({ label: `${session.name}の議決結果`, url: resultsPage.url, fetchedAt: resultsPage.fetchedAt });

		const out = outcome(r?.result ?? '', committee, submittedDate(text), r?.date ?? null);
		if (!out) {
			warnings.push(`${number}: unrecognised result 「${r?.result}」, skipped`);
			continue;
		}
		bills.push({
			facts: { id: billId(assembly.id, s, n, by), assembly: assembly.id, number, official, by, session: session.name, committee, ...out, sources },
			input: `【議案本文】\n${text}\n`
		});
	}
	return { bills, warnings };
}
