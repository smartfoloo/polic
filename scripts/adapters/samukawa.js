// 寒川町議会. The 審議結果 index links a page per year (「令和8年 審議結果」). The year is one 定例会 that meets
// several times; each meeting is an h2 (「第1回定例会3月会議」) followed by tables 議案番号 (「第58号」) | 件名 → PDF |
// 結果 | 議決日 (「8月27日」), captioned 町長提出議案 or 陳情. Bill numbers run through the year. No committee is
// published, and no session dates, only vote days.

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

	const year = `令和${s.year - 2018}年`;
	const index = await get(assembly.listPages[0].url);
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === `${year}審議結果`);
	if (!link) return { bills, warnings: [`No ${year} page on ${index.url}`] };
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);

	// The meeting's tables: those between its h2 and the next one.
	const meeting = key(session.name).slice(year.length);
	let inMeeting = false;
	/** @type {any[]} */
	const tables = [];
	for (const el of $('h2, table').toArray()) {
		if (el.tagName === 'h2') inMeeting = key($(el).text()) === meeting;
		else if (inMeeting && key($(el).find('tr').first().text()).startsWith('議案番号')) tables.push(el);
	}
	if (!tables.length) return { bills, warnings: [`${meeting} is not on ${page.url} yet`] };

	for (const table of tables) {
		const caption = key($(table).find('caption').text());
		if (caption !== '町長提出議案') {
			warnings.push(`${caption || 'uncaptioned'} table skipped: not supported yet`);
			continue;
		}
		for (const tr of $(table).find('tr').toArray().slice(1)) {
			const tds = $(tr).children('td').toArray().map((td) => $(td));
			if (tds.length < 4) continue;
			const n = Number(key(tds[0].text()).match(/^第(\d+)号$/)?.[1]);
			const official = stripFileNote(tds[1].text());
			if (!n || !inScope(official)) continue;
			const label = `議案第${n}号`;
			const result = squash(tds[2].text());
			const d = key(tds[3].text()).match(/^(\d+)月(\d+)日$/);
			const voteDate = d ? `${s.year}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}` : null;

			const sources = [{ label: `${year} 審議結果`, url: page.url, fetchedAt: page.fetchedAt }];
			let input = '';
			let submitted = null;
			const pdf = tds[1].find('a[href$=".pdf"]').attr('href');
			if (pdf) {
				const href = new URL(pdf, page.url).href;
				const res = await get(href);
				const text = await pdfText(res.body);
				submitted = submittedDate(text);
				input = `【議案本文】\n${text}\n`;
				sources.push({ label: `${label}（PDF）`, url: href, fetchedAt: res.fetchedAt });
			} else warnings.push(`${label}: no bill PDF found`);

			const out = outcome(result, null, submitted, voteDate, { committeeUnknown: true });
			if (!out) {
				warnings.push(`${label}: unrecognised result 「${result}」, skipped`);
				continue;
			}
			bills.push({
				facts: { id: billId(assembly.id, s, n, 'head'), assembly: assembly.id, number: label, official, by: 'head', session: session.name, committee: null, ...out, sources },
				input
			});
		}
	}
	return { bills, warnings };
}
