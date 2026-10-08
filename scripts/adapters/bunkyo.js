// 文京区議会. The 議決結果 page links one PDF per session, 「令和8年6月定例議会（令和8年6月2日～6月25日）（PDF）」,
// posted after it closes. Its text runs together, one bill per run: 「25 文京区印鑑条例の一部を改正する条例 32 31 26 5
// 可決〇〇×…」 (number, title, attending, voting, for, against, result, then each member's vote), member bills as
// 「議3 …」, and 簡易表決 bills with attendance only (「議6 … 32 可決」). Committee labels are scattered through the
// text, so committees aren't read. The bill PDFs are vertical-text bundles whose punctuation and small kana come
// out as stray CJK glyphs, so bills are title-only until that is mapped.

import { billId, inScope, outcome } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');
const ROW = /(議)?(\d+) ([^\s\d〇×－-][^〇×]*?) \d+(?: \d+ \d+ \d+)? (原案可決|修正可決|可決|否決)/g;

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
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t).startsWith(key(`${session.name}（`)));
	if (!link) return { bills, warnings: [`${session.name} is not on ${index.url} yet (results appear after it closes)`] };
	const pdf = await get(link.href);
	const text = await pdfText(pdf.body);
	if (!key(text.slice(0, 100)).includes(key(session.name))) return { bills, warnings: [`${pdf.url} doesn't start with ${session.name}`] };

	const seen = new Set();
	for (const m of text.matchAll(ROW)) {
		const [, member, number, title, result] = m;
		const official = title.trim();
		if (!inScope(official)) continue;
		const by = member ? 'member' : 'head';
		const n = Number(number);
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
				sources: [{ label: `${session.name} 議決結果`, url: pdf.url, fetchedAt: pdf.fetchedAt }]
			},
			input: ''
		});
	}
	return { bills, warnings };
}
