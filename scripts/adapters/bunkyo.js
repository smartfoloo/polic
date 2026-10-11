// 文京区議会. The 議決結果 page links one PDF per session, 「令和8年6月定例議会（令和8年6月2日～6月25日）（PDF）」,
// posted after it closes. Its text runs together, one bill per run: 「25 文京区印鑑条例の一部を改正する条例 32 31 26 5
// 可決〇〇×…」 (number, title, attending, voting, for, against, result, then each member's vote), member bills as
// 「議3 …」, and 簡易表決 bills with attendance only (「議6 … 32 可決」). Committee labels are scattered through the
// text, so committees aren't read. Bill texts come from the year's 議案 index → 「令和8年6月定例議会に提出された議案」 →
// bundles 「【議案第2～24号】令和8年6月文京区議会定例議会議案（PDF…）」: vertical text whose punctuation, brackets and
// small kana come out as stray CJK Extension A glyphs (「改正する䣎」), mapped back in GLYPHS. A bill whose text still
// has an unmapped one stays title-only. Member bills have no published text.

import { billId, inScope, outcome, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName, toNumber } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');
// Vertical-form glyphs as the bundles' fonts map them, read from context in 令和8年6月's 議案第2～24号.
const GLYPHS = { 䣍: '、', 䣎: '。', 䣓: '「', 䣔: '」', 䥹: '（', 䥺: '）', 䤀: 'ー', 䣹: 'ッ', 䣬: 'っ' };
const UNMAPPED = /[\u3400-\u4dbf]/;
const BILL_START = /議案第([〇一二三四五六七八九十百]+)号(?=[^頁]{1,200}?右の議案を提出する)/g;

/**
 * Head bills' texts for the session, by number, from the bundles on its 議案 page.
 * @param {import('../../src/lib/config/assemblies.js').Assembly} assembly
 * @param {import('../../src/lib/config/assemblies.js').Session} session
 * @param {(url: string) => Promise<import('../lib/fetch.js').FetchResult>} get
 * @param {string[]} warnings
 */
async function billTexts(assembly, session, get, warnings) {
	/** @type {Map<number, { text: string, source: import('../lib/fetch.js').FetchResult }>} */
	const texts = new Map();
	const index = await get(assembly.listPages[1].url);
	const [page] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === key(`${session.name}に提出された議案`));
	if (!page) {
		warnings.push(`No 議案 page for ${session.name} on ${index.url}; bills are title-only`);
		return texts;
	}
	const res = await get(page.href);
	const bundles = findLinks(loadHtml(res.body, res.contentType), res.url, (t) => key(t).startsWith('【議案第') && key(t).includes('議会議案'));
	for (const b of bundles) {
		const pdf = await get(b.href);
		const text = [...(await pdfText(pdf.body))].map((ch) => GLYPHS[/** @type {keyof typeof GLYPHS} */ (ch)] ?? ch).join('');
		const starts = [...text.matchAll(BILL_START)];
		starts.forEach((m, i) => {
			const body = text.slice(m.index, starts[i + 1]?.index ?? text.length);
			if (UNMAPPED.test(body)) warnings.push(`議案第${toNumber(m[1])}号: unmapped glyph 「${body.match(UNMAPPED)?.[0]}」 in ${pdf.url}, title-only`);
			else texts.set(toNumber(m[1]), { text: body, source: pdf });
		});
	}
	return texts;
}

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

	const texts = await billTexts(assembly, session, get, warnings);
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
		const t = by === 'head' ? texts.get(n) : undefined;
		const out = outcome(result, null, t ? submittedDate(t.text) : null, null, { committeeUnknown: true });
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
				...(t ? {} : { titleOnly: true }),
				sources: [
					...(t ? [{ label: `${label}（PDF）`, url: t.source.url, fetchedAt: t.source.fetchedAt }] : []),
					{ label: `${session.name} 議決結果`, url: pdf.url, fetchedAt: pdf.fetchedAt }
				]
			},
			input: t ? `【議案本文】\n${t.text}\n` : ''
		});
	}
	return { bills, warnings };
}
