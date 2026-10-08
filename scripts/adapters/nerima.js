// 練馬区議会. The year page links each session (「第三回定例会」), whose 「議案の内容」 page has a table per
// submission day and proposer, captioned 「9月3日　区長提出議案」 or 「6月5日　議員提出議案」: 議案番号 (「第41号」) |
// 件名 | 付託委員会 (abbreviated: 「企画総務」, 「-」 or 「省略」 = none) | 結果, each bill row followed by a one-cell
// row with its 内容 paragraph. That paragraph is the only text published; there are no bill PDFs and no vote
// dates.

import { billId, inScope, outcome } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');
const KANJI = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

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

	const linkText = `第${KANJI[s.n]}回${s.kind}`;
	let sessionLink = null;
	for (const { url } of assembly.listPages) {
		const year = await get(url);
		if (!key(year.body.toString()).includes(`令和${s.year - 2018}年`)) continue;
		[sessionLink] = findLinks(loadHtml(year.body, year.contentType), year.url, (t) => key(t) === linkText);
		if (sessionLink) break;
	}
	if (!sessionLink) return { bills, warnings: [`${linkText} is not on any of the listed year pages`] };
	const sessionPage = await get(sessionLink.href);
	const [listLink] = findLinks(loadHtml(sessionPage.body, sessionPage.contentType), sessionPage.url, (t) => key(t) === '議案の内容');
	if (!listLink) return { bills, warnings: [`No 議案の内容 link on ${sessionPage.url}`] };
	const page = await get(listLink.href);
	const $ = loadHtml(page.body, page.contentType);

	for (const table of $('table').toArray()) {
		const caption = key($(table).find('caption').text()).match(/^(\d+)月(\d+)日(区長|議員)提出議案$/);
		if (!caption) continue;
		const submitted = `${s.year}-${caption[1].padStart(2, '0')}-${caption[2].padStart(2, '0')}`;
		const by = caption[3] === '議員' ? 'member' : 'head';
		const rows = $(table).find('tr').toArray();

		for (const [i, tr] of rows.entries()) {
			const tds = $(tr).children('th, td').toArray().map((td) => $(td));
			if (tds.length !== 4) continue;
			const m = key(tds[0].text()).match(/^(?:議員提出)?第(\d+)号$/);
			const official = squash(tds[1].text());
			if (!m || !inScope(official)) continue;
			const n = Number(m[1]);
			const label = by === 'member' ? `議員提出議案第${n}号` : `議案第${n}号`;
			const abbr = key(tds[2].text());
			const committee = /^[-－―省略]*$/.test(abbr) ? null : abbr.endsWith('委員会') ? abbr : `${abbr}委員会`;
			const result = key(tds[3].text()).replace(/^[-－―]$/, '');
			const next = rows[i + 1] ? $(rows[i + 1]).children('td').toArray() : [];
			const content = next.length === 1 ? squash($(next[0]).text()) : '';

			const out = outcome(result, committee, submitted);
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
					committee,
					...out,
					...(content ? {} : { titleOnly: true }),
					sources: [{ label: `${session.name} 議案の内容`, url: page.url, fetchedAt: page.fetchedAt }]
				},
				input: content ? `【内容】\n${content}\n` : ''
			});
		}
	}
	return { bills, warnings };
}
