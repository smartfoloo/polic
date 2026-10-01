// 武蔵野市議会. Bills are listed by year, a table per session (caption 「第3回定例会市長提出議案一覧」):
// 議案番号 | 件名 | 付託委員会 (abbreviated: 総務 → 総務委員会) | 委員会議決日 | 委員会結果 | 本会議議決日 |
// 本会議結果. Member bills are on a sibling year page (議案番号 | 件名 | 上程日 | 議決日 | 結果) with their
// PDFs below. Mayor bills' PDFs are on the city's 提出議案一覧 page for the session, matched by title.
// Bill numbers run through the year, so ids stay unique per session. Dates have no year (「9月15日」).
// The bill PDFs are scans without a text layer, so the text is empty until OCR is added.

import { billId, inScope, outcome, stripFileNote, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName, squash, titleKey } from '../lib/text.js';

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
	const short = key(session.name).replace(/^令和\d+年/, '');
	const isoDay = (/** @type {string} */ t) => {
		const m = key(t).match(/(\d+)月(\d+)日/);
		return m ? `${s.year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
	};

	for (const { url } of assembly.listPages) {
		const page = await get(url);
		const $ = loadHtml(page.body, page.contentType);
		const member = /議員提出/.test(squash($('title').text()));
		const table = $('table')
			.toArray()
			.find((t) => key($(t).find('caption').text()).startsWith(short));
		if (!table) continue;

		/** @type {Map<string, string>} title key or bill label → PDF URL */
		const pdfs = new Map();
		if (member) {
			for (const l of findLinks($, page.url, (_, href) => href.endsWith('.pdf'))) {
				const n = key(l.text).match(/議員提出議案第(\d+)号/)?.[1];
				if (n) pdfs.set(`m${n}`, l.href);
			}
		} else {
			const [link] = findLinks($, page.url, (t) => key(t) === key(`${session.name}提出議案一覧`));
			if (link) {
				const list = await get(link.href);
				for (const l of findLinks(loadHtml(list.body, list.contentType), list.url, (_, href) => href.endsWith('.pdf'))) pdfs.set(titleKey(stripFileNote(l.text)), l.href);
			} else warnings.push(`No 提出議案一覧 link for ${session.name} on ${page.url}`);
		}

		const trs = $(table).find('tr').toArray();
		const headers = $(trs[0]).children().toArray().map((c) => key($(c).text()));
		const col = (/** @type {string} */ h) => headers.indexOf(h);
		for (const tr of trs.slice(1)) {
			const cells = $(tr).children('td').toArray().map((td) => squash($(td).text()));
			if (cells.length !== headers.length) continue;
			const n = Number(key(cells[col('議案番号')]));
			const official = stripFileNote(cells[col('件名')]);
			if (!n || !inScope(official)) continue;
			const by = member ? 'member' : 'head';
			const label = member ? `議員提出議案第${n}号` : `議案第${n}号`;

			const committeeCell = member ? '' : key(cells[col('付託委員会')]);
			const committee = committeeCell && committeeCell !== '付託省略' ? `${committeeCell}委員会` : null;
			const result = key(cells[col(member ? '結果' : '本会議結果')]);
			const voteDate = isoDay(cells[col(member ? '議決日' : '本会議議決日')]);

			const sources = [{ label: squash($('title').text()).split('｜')[0], url: page.url, fetchedAt: page.fetchedAt }];
			let input = '';
			let submitted = null;
			const href = pdfs.get(member ? `m${n}` : titleKey(official));
			if (href) {
				const res = await get(href);
				const text = await pdfText(res.body);
				submitted = submittedDate(text);
				if (text.trim()) input = `【議案本文】\n${text}\n`;
				else warnings.push(`${label}: the PDF is a scan with no text`);
				sources.push({ label: `${label}（PDF）`, url: href, fetchedAt: res.fetchedAt });
			} else warnings.push(`${label}: no bill PDF found`);

			const out = outcome(result, committee, submitted, voteDate);
			if (!out) {
				warnings.push(`${label}: unrecognised result 「${result}」, skipped`);
				continue;
			}
			bills.push({
				facts: { id: billId(assembly.id, s, n, by), assembly: assembly.id, number: label, official, by, session: session.name, committee, ...out, ...(input ? {} : { titleOnly: true }), sources },
				input
			});
		}
	}
	return { bills, warnings };
}
