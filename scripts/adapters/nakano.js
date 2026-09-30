// 中野区議会 (kugikai-nakano.jp). The year's 議案一覧 page links each session's list (…&gian_id=N). One row
// per bill: the bill PDF link (「第５１号議案 <title>」) followed by a short 内容 and the 担当 section, then
// the committee (abbreviated: 区民 → 区民委員会) and the result with its vote date (「令和8年7月16日 可決」).

import { billId, inScope, statusFrom, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseReiwaDate, parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */
/** @typedef {(url: string) => Promise<import('../lib/fetch.js').FetchResult>} Get */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');

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

	// The year page links sessions as 「[第３回定例会]」.
	const tab = `[${key(session.name).replace(/^令和(\d+|元)年/, '')}]`;
	let link = null;
	for (const { url } of assembly.listPages) {
		const index = await get(url);
		[link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === tab);
		if (link) break;
	}
	if (!link) return { bills, warnings: [`${session.name} is not on any of the listed index pages`] };
	const listUrl = new URL(link.href);
	listUrl.hash = '';
	const list = await get(listUrl.href);
	const $ = loadHtml(list.body, list.contentType);

	for (const tr of $('tr').toArray()) {
		const cells = $(tr).children('td').toArray().map((td) => $(td));
		const a = cells[0]?.find('a[href$=".pdf"]').first();
		if (!a?.length || cells.length < 3) continue;
		const m = squash(a.text().normalize('NFKC')).match(/^(?:(議員提出議案)第(\d+)号|第(\d+)号議案)\s*(.+)$/);
		if (!m) continue;
		const official = m[4];
		if (!inScope(official)) continue;
		const by = m[1] ? 'member' : 'head';
		const n = Number(m[2] ?? m[3]);
		const label = by === 'member' ? `議員提出議案第${n}号` : `第${n}号議案`;

		const short = key(cells[1].text());
		const committee = !short || short === '-' ? null : `${short}委員会`;
		const result = key(cells[2].text()).replace(/^-$/, '');
		const st = statusFrom(result, committee !== null);
		if (!st) {
			warnings.push(`${label}: unrecognised result 「${result}」, skipped`);
			continue;
		}

		// 内容 is the cell's text after the link, up to the 担当 (department and phone number).
		const gist = squash(cells[0].text().normalize('NFKC').replace(a.text().normalize('NFKC'), '').replace(/担当.*$/s, ''));
		const href = new URL(/** @type {string} */ (a.attr('href')), list.url).href;
		const pdf = await get(href);
		const text = await pdfText(pdf.body);
		const sources = [
			{ label: `${session.name} 議案一覧`, url: list.url, fetchedAt: list.fetchedAt },
			{ label: `${label}（PDF）`, url: href, fetchedAt: pdf.fetchedAt }
		];

		const voted = st.stage === 3 ? parseReiwaDate(result) : null;
		bills.push({
			facts: {
				id: billId(assembly.id, s, n, by),
				assembly: assembly.id,
				number: label,
				official,
				by,
				session: session.name,
				committee,
				...st,
				dateKind: voted ? (st.status === '否決' ? '否決' : '可決') : '提案',
				date: voted ?? submittedDate(text),
				sources
			},
			input: `${gist ? `【概要】\n${gist}\n\n` : ''}【議案本文】\n${text}\n`
		});
	}
	return { bills, warnings };
}
