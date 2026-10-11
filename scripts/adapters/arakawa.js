// 荒川区議会. One 定例会 per fiscal year, meeting as 開会会議, month 会議 (「6月会議」), 緊急会議 and 閉会会議; bill
// numbers run through the fiscal year. 議案の審議結果 → 「令和8年度定例会」 → a page per meeting with one table:
// section rows (「区長提出議案（11件）」, 「議員提出議案（1件）」) and bill rows 「第 5 号」 | title | a column per 会派 |
// 結果. 可決した議案 → 「令和8年度定例会」 → 「6月会議」 lists each passed bill, linking a page with its 提案理由
// paragraph: the only text published. No vote, submission or session dates, and no committees.

import { billId, inScope, outcome } from '../lib/bills.js';
import { findLinks, loadHtml, tableGrid } from '../lib/html.js';
import { parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */
/** @typedef {(url: string) => Promise<import('../lib/fetch.js').FetchResult>} Get */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');

/**
 * A page two links down from an index: index → 「令和8年度定例会」 → the link `match` accepts.
 * @param {string} indexUrl
 * @param {string} fy 「令和8年度」
 * @param {(text: string) => boolean} match
 * @param {Get} get
 */
async function follow(indexUrl, fy, match, get) {
	const index = await get(indexUrl);
	const [yearLink] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === `${fy}定例会`);
	if (!yearLink) return null;
	const year = await get(yearLink.href);
	const [link] = findLinks(loadHtml(year.body, year.contentType), year.url, (t) => match(key(t)));
	return link ? get(link.href) : null;
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
	const fy = `令和${s.year - 2018}年度`;
	const meeting = key(session.name).split('・')[1];

	const page = await follow(assembly.listPages[0].url, fy, (t) => t === `議案の審議結果(${key(session.name)})`, get);
	if (!page) return { bills, warnings: [`${session.name} results are not up yet`] };
	const $ = loadHtml(page.body, page.contentType);

	// Passed bills' pages, by title. A member bill's title there carries the proposer: 「…について（並木一元議員）」.
	const passed = await follow(assembly.listPages[1].url, fy, (t) => t === meeting, get);
	const passedLinks = passed ? findLinks(loadHtml(passed.body, passed.contentType), passed.url, () => true) : [];
	if (!passed) warnings.push(`${session.name}: no 可決した議案 page yet, bills are title-only`);

	/** @type {'head' | 'member' | null} */
	let by = null;
	for (const table of $('table').toArray()) {
		for (const row of tableGrid($, table)) {
			const first = key(row[0] ?? '');
			if (/^区長提出議案/.test(first)) by = 'head';
			else if (/^議員提出議案/.test(first)) by = 'member';
			else if (/^(委員会提出議案|同意|諮問|報告)/.test(first)) by = null;
			const num = first.match(/^第(\d+)号$/);
			if (!num || !by) continue;
			const n = Number(num[1]);
			const official = squash(row[1] ?? '');
			if (!inScope(official)) continue;
			const label = by === 'head' ? `議案第${n}号` : `議員提出議案第${n}号`;
			const result = key(row.at(-1) ?? '');

			const sources = [{ label: `${session.name} 議案の審議結果`, url: page.url, fetchedAt: page.fetchedAt }];
			let input = '';
			const link = passedLinks.find((l) => key(l.text) === key(official) || key(l.text).startsWith(`${key(official)}(`));
			if (link) {
				const res = await get(link.href);
				const $b = loadHtml(res.body, res.contentType);
				const reason = $b('#tmp_contents p')
					.toArray()
					.map((p) => squash($b(p).text()))
					.filter(Boolean)
					.join('\n');
				if (reason) {
					input = `【提案理由】\n${reason}\n`;
					sources.push({ label: `${label} 提案理由`, url: res.url, fetchedAt: res.fetchedAt });
				} else warnings.push(`${label}: no 提案理由 on ${res.url}`);
			} else if (passed && /可決/.test(result)) warnings.push(`${label}: not on the 可決した議案 page, title-only`);

			const out = outcome(result, null, null, null, { committeeUnknown: true });
			if (!out) {
				warnings.push(`${label}: unrecognised result 「${result}」, skipped`);
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
					...(input ? {} : { titleOnly: true }),
					sources
				},
				input
			});
		}
	}
	return { bills, warnings };
}
