// 清瀬市議会. The 議会 top page links 「令和8年 本会議の結果」 (older years under 過去の本会議の結果), which links a page
// per session (「令和8年 清瀬市議会第2回定例会、議決等の結果」) with results PDFs by kind. The 市長提出議案 PDF has a
// record per bill: 「議案」「第31号」, the title wrapped in a narrow column, an optional 「…(継続審査)」 line, a 概要
// paragraph, 所管課, then the vote date and result. That paragraph is the only text kept: the 議案一覧 pages are
// up only while a session is open. The 議員提出議案 PDF has number, title, vote date and result. Results are
// posted after the session; no committee or session dates are published.

import { billId, inScope, outcome } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');
// A full title-column line is about 16 characters; a shorter one ends the title.
const TITLE_WIDTH = 15;
const RESULT = /^(原案可決|修正可決|可決|否決|承認|不承認|同意|不同意|認定|不認定|継続審査|撤回)/;

/**
 * Records from a results PDF, split at 「議案」「第31号」 (head) or 「議員提出」「議案第3号」 (member).
 * @param {string} text
 */
function records(text) {
	const lines = text
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l && !/^-\d+-$/.test(l));
	/** @type {{ by: 'head' | 'member', n: number, lines: string[] }[]} */
	const out = [];
	for (let i = 0; i < lines.length; i++) {
		const head = lines[i] === '議案' && key(lines[i + 1] ?? '').match(/^第(\d+)号$/);
		const member = lines[i] === '議員提出' && key(lines[i + 1] ?? '').match(/^議案第(\d+)号$/);
		if (head || member) {
			out.push({ by: head ? 'head' : 'member', n: Number((head || member || [])[1]), lines: [] });
			i++;
		} else out.at(-1)?.lines.push(lines[i]);
	}
	return out;
}

/**
 * A head bill's title, 概要, vote date (month, day) and result.
 * @param {string[]} lines
 */
function headRecord(lines) {
	let t = 1;
	while (t < lines.length && t < 4 && lines[t - 1].length >= TITLE_WIDTH && !lines[t].startsWith('…')) t++;
	const title = key(lines.slice(0, t).join(''));
	const rest = lines.slice(t).filter((l) => !l.startsWith('…'));
	const dateAt = rest.findLastIndex((l) => /(?:^|[^年\d])\d{1,2}月\d{1,2}日$/.test(key(l)));
	const date = dateAt >= 0 ? key(rest[dateAt]).match(/(\d{1,2})月(\d{1,2})日$/) : null;
	const resultAt = rest.findIndex((l, i) => i > dateAt && RESULT.test(key(l)));
	const result = resultAt >= 0 ? key(rest[resultAt]) + (key(rest[resultAt + 1] ?? '').startsWith('及び') ? key(rest[resultAt + 1]) : '') : '';
	const content = rest
		.filter((l, i) => i !== dateAt && i !== resultAt && !(i === resultAt + 1 && key(l).startsWith('及び')) && !key(l).startsWith('所管課'))
		.join('\n');
	return { title, content, date, result };
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

	const year = `令和${s.year - 2018}年`;
	/** @type {{ text: string, href: string } | undefined} */
	let yearLink;
	for (const list of assembly.listPages) {
		const index = await get(list.url);
		[yearLink] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === `${year}本会議の結果`);
		if (yearLink) break;
	}
	if (!yearLink) return { bills, warnings: [`No ${year} 本会議の結果 page found`] };
	const yearPage = await get(yearLink.href);
	const [sessionLink] = findLinks(loadHtml(yearPage.body, yearPage.contentType), yearPage.url, (t) => key(t).replace('清瀬市議会', '') === `${key(session.name)}、議決等の結果`);
	if (!sessionLink) return { bills, warnings: [`${session.name} results are not up yet`] };
	const page = await get(sessionLink.href);
	const $ = loadHtml(page.body, page.contentType);

	for (const [kind, by] of /** @type {const} */ ([
		['(市長提出議案)議決結果', 'head'],
		['(議員提出議案)議決結果', 'member']
	])) {
		const [link] = findLinks($, page.url, (t) => key(t).includes(kind));
		if (!link) continue;
		const pdf = await get(link.href);
		for (const rec of records(await pdfText(pdf.body)).filter((r) => r.by === by)) {
			const label = by === 'head' ? `議案第${rec.n}号` : `議員提出議案第${rec.n}号`;
			/** @type {{ title: string, content: string, date: RegExpMatchArray | null, result: string }} */
			let r;
			if (by === 'head') r = headRecord(rec.lines);
			else {
				const m = key(rec.lines.join('')).match(/^(.+?)(\d{1,2})月(\d{1,2})日(.+)$/);
				r = { title: m?.[1] ?? key(rec.lines.join('')), content: '', date: m ? [m[0], m[2], m[3]] : null, result: m?.[4] ?? '' };
			}
			if (!inScope(r.title)) continue;
			const voteDate = r.date ? `${s.year}-${r.date[1].padStart(2, '0')}-${r.date[2].padStart(2, '0')}` : null;
			const out = outcome(r.result, null, null, voteDate, { committeeUnknown: true });
			if (!out) {
				warnings.push(`${label}: unrecognised result 「${r.result}」, skipped`);
				continue;
			}
			bills.push({
				facts: {
					id: billId(assembly.id, s, rec.n, by),
					assembly: assembly.id,
					number: label,
					official: r.title,
					by,
					session: session.name,
					committee: null,
					...out,
					...(r.content ? {} : { titleOnly: true }),
					sources: [{ label: `${session.name} 議決結果（PDF）`, url: pdf.url, fetchedAt: pdf.fetchedAt }]
				},
				input: r.content ? `【概要】\n${r.content}\n` : ''
			});
		}
	}
	return { bills, warnings };
}
