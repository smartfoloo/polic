// 狛江市議会. The 審査結果一覧 page has a paragraph per session under an h4 year (「第2回定例会　議案、陳情等審査結果一覧
// ／賛否一覧表」), each a PDF with timestamp filenames, posted well after the session closes. The PDF lists 「議案第 2 5
// 号狛江市印鑑条例の一部を改正する条例６月 19 日原案可決」, member bills as 「議員提出 第３号 …」. No committees are
// shown. Bill texts are only in news posts for the session in progress, which are taken down afterwards, so bills
// are title-only.

import { billId, inScope, outcome } from '../lib/bills.js';
import { loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');
const BILL = /^(議員提出|議案)第([\d０-９]+)号(.+?)([\d０-９]+)月([\d０-９]+)日(原案可決|修正可決|可決|否決|継続審査)/;

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
	const $ = loadHtml(index.body, index.contentType);
	const year = key(session.name).match(/^令和(\d+|元)年/)?.[0] ?? '';
	const part = key(session.name).slice(year.length);
	const heading = $('h4')
		.toArray()
		.find((h) => key($(h).text()) === year);
	const para = heading
		? $(heading)
				.nextUntil('h4', 'p')
				.toArray()
				.find((p) => key($(p).text()).startsWith(part))
		: undefined;
	const href = para ? $(para).find('a[title="議案、陳情等審査結果一覧"], a[title="議案等審査結果一覧"]').attr('href') : undefined;
	if (!href) return { bills, warnings: [`${session.name} is not on ${index.url} yet (results appear after it closes)`] };
	const pdf = await get(new URL(href, index.url).href);
	// Titles wrap mid-word and numbers are spaced out (「第 2 5 号」), so whitespace goes.
	const text = (await pdfText(pdf.body)).replace(/\s+/g, '');
	if (!key(text).startsWith(key(session.name))) return { bills, warnings: [`${pdf.url} isn't the 審査結果 for ${session.name}`] };
	const date = (/** @type {string} */ m, /** @type {string} */ d) =>
		`${s.year}-${m.normalize('NFKC').padStart(2, '0')}-${d.normalize('NFKC').padStart(2, '0')}`;

	for (const chunk of text.split(/(?=(?:議員提出|議案|報告|同意|陳情|諮問)第[\d０-９]+号)/)) {
		const m = chunk.match(BILL);
		if (!m) continue;
		const [, kind, number, official, month, day, result] = m;
		if (!inScope(official)) continue;
		const by = kind === '議員提出' ? 'member' : 'head';
		const n = Number(number.normalize('NFKC'));
		const label = by === 'member' ? `議員提出議案第${n}号` : `議案第${n}号`;
		const out = outcome(result, null, null, date(month, day), { committeeUnknown: true });
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
				sources: [{ label: `${session.name} 審査結果一覧`, url: pdf.url, fetchedAt: pdf.fetchedAt }]
			},
			input: ''
		});
	}
	return { bills, warnings };
}
