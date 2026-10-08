// 江東区議会. The year page links one 審議結果 PDF per session (「令和8年第2回定例会（PDF）」), posted after it
// closes. Each bill reads 「議案 / 第70号 / title (wrapping over lines) 〇〇×… 原案可決」, member bills 「議員提出議案 /
// 第４号 …」. The vote day is in each table's heading (「○区長提出議案（7月1日議決）」), but the headings come out of
// the PDF away from their rows, so bills are matched by number only and get no vote date. No committees or bill
// texts are published, so bills are title-only.

import { billId, inScope, outcome } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');
const BILL = /^(議員提出議案|議案)第([\d０-９]+)号([^〇○×]+)[〇○×欠\d０-９]*(原案可決|修正可決|可決|否決)/;

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

	const index = await get(assembly.listPages[0].url);
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t).startsWith(key(`${session.name}（PDF`)));
	if (!link) return { bills, warnings: [`${session.name} is not on ${index.url} yet (results appear after it closes)`] };
	const pdf = await get(link.href);
	// Titles wrap mid-word, so whitespace goes; everything else is kept as printed.
	const text = (await pdfText(pdf.body)).replace(/\s+/g, '');
	if (!key(text).includes(`(${key(session.name)})`)) return { bills, warnings: [`${pdf.url} isn't the 審議結果 for ${session.name}`] };

	const seen = new Set();
	for (const chunk of text.split(/(?=(?:議員提出議案|議案)第[\d０-９]+号)/)) {
		const m = chunk.match(BILL);
		if (!m) continue;
		const [, kind, number, official, result] = m;
		if (!inScope(official)) continue;
		const by = kind === '議員提出議案' ? 'member' : 'head';
		const n = Number(number.normalize('NFKC'));
		const label = by === 'member' ? `議員提出議案第${n}号` : `議案第${n}号`;
		if (seen.has(label)) {
			warnings.push(`${label} appears twice in ${pdf.url}, second skipped`);
			continue;
		}
		seen.add(label);
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
				titleOnly: true,
				sources: [{ label: `${session.name} 審議結果`, url: pdf.url, fetchedAt: pdf.fetchedAt }]
			},
			input: ''
		});
	}
	return { bills, warnings };
}
