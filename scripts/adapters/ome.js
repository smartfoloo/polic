// 青梅市議会. A year-long session runs May–April (「令和8年市議会定例会」) and meets as 「5月招集議会」,
// 「6月定例議会」 and so on; bill numbers restart each May. The 議案審議結果一覧 index has a heading per
// session year (h2 for the current one, h3 for past ones) and a list of meeting links under it.
// Each meeting page has one table, with a two-row header:
// 議案番号 (議3, 委1) | 議案件名 (bill PDF) | 議案概要 (one sentence) | 提出日 | 付託委員会 (（即決） = none) |
// 審査日 | 審査結果 | 議決日 | 議決結果. Dates are 「8.6.25」 (令和8年6月25日).

import { billId, inScope, outcome, stripFileNote, submittedDate } from '../lib/bills.js';
import { loadHtml, tableGrid } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/[\s​]+/g, '');
const isoDot = (/** @type {string} */ s) => {
	const m = key(s).match(/^(\d+)\.(\d+)\.(\d+)$/);
	return m ? `${Number(m[1]) + 2018}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null;
};

/**
 * 議3 (mayor) · 議員提出N / 議提N (member) · 委1 (committee). Member bills haven't been seen yet, so their
 * format is a guess; an in-scope title with any other number is reported, not dropped silently.
 * @returns {{ by: 'head' | 'member' | 'committee', n: number, label: string } | null}
 */
function parseNumber(/** @type {string} */ text) {
	const t = key(text);
	const m = t.match(/^(議員提出|議提|議|委)第?(\d+)号?$/);
	if (!m) return null;
	const by = m[1] === '議' ? 'head' : m[1] === '委' ? 'committee' : 'member';
	return { by, n: Number(m[2]), label: by === 'head' ? `議案第${m[2]}号` : by === 'member' ? `議員提出議案第${m[2]}号` : `委員会提出議案第${m[2]}号` };
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

	// 「令和8年定例会」 heading + 「6月定例議会」 link = 「令和8年市議会定例会6月定例議会」.
	const index = await get(assembly.listPages[0].url);
	const $i = loadHtml(index.body, index.contentType);
	// The current year is an h2, past years are h3s under 「過去の議案審議結果一覧」.
	const link = $i('h2, h3')
		.toArray()
		.filter((h) => /^令和.+年定例会$/.test(key($i(h).text())))
		.flatMap((h) => {
			const year = key($i(h).text()).replace('定例会', '市議会定例会');
			return $i(h).next('ul').find('a[href]').toArray().map((a) => ({ name: year + key($i(a).text()), href: new URL(/** @type {string} */ ($i(a).attr('href')), index.url).href }));
		})
		.find((l) => l.name === key(session.name));
	if (!link) return { bills, warnings: [`${session.name} is not on ${index.url}`] };

	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);
	for (const table of $('table').toArray()) {
		const grid = tableGrid($, table);
		const h = grid.findIndex((r) => r.some((c) => key(c) === '議決日'));
		if (h < 0) continue;
		const headers = grid[h].map(key);
		const col = (/** @type {RegExp} */ re) => headers.findIndex((c) => re.test(c));
		const [cNum, cTitle, cOutline, cSubmitted, cCommittee, cVoteDate, cResult] = [/番号/, /件名/, /概要/, /提出日/, /付託委員会/, /^議決日$/, /^議決結果$/].map(col);
		const rows = $(table).find('tr').toArray().slice(h + 1);

		for (const [i, cells] of grid.slice(h + 1).entries()) {
			const official = stripFileNote(cells[cTitle] ?? '');
			if (!inScope(official)) continue;
			const num = parseNumber(cells[cNum]);
			if (!num) {
				warnings.push(`Unrecognised bill number 「${cells[cNum]}」 for ${official}, skipped`);
				continue;
			}
			if (num.by === 'committee') {
				warnings.push(`${num.label} (committee bill) skipped: not supported yet`);
				continue;
			}
			const committeeCell = key(cells[cCommittee] ?? '');
			const committee = /委員会$/.test(committeeCell) ? committeeCell : null;
			const result = key(cells[cResult] ?? '');

			const sources = [{ label: `議案審議結果一覧（${session.name}）`, url: page.url, fetchedAt: page.fetchedAt }];
			const outline = (cells[cOutline] ?? '').trim();
			let input = outline ? `【議案概要】\n${outline}\n` : '';
			let submitted = isoDot(cells[cSubmitted] ?? '');
			const pdf = $(rows[i]).find('a[href$=".pdf"]').attr('href');
			if (pdf) {
				const href = new URL(pdf, page.url).href;
				const res = await get(href);
				const text = await pdfText(res.body);
				submitted = submittedDate(text) ?? submitted;
				input += `\n【議案本文】\n${text}\n`;
				sources.push({ label: `${num.label}（PDF）`, url: href, fetchedAt: res.fetchedAt });
			} else warnings.push(`${num.label}: no bill PDF found`);

			const out = outcome(result, committee, submitted, isoDot(cells[cVoteDate] ?? ''));
			if (!out) {
				warnings.push(`${num.label}: unrecognised result 「${result}」, skipped`);
				continue;
			}
			bills.push({
				facts: { id: billId(assembly.id, s, num.n, num.by), assembly: assembly.id, number: num.label, official, by: num.by, session: session.name, committee, ...out, sources },
				input
			});
		}
	}
	return { bills, warnings };
}
