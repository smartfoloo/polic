// Numbers in a draft that the source doesn't contain, for the review page. Sources write numbers in
// kanji (一八、四一七人, 百五十万円) and years in 令和; drafts write 150万円 and 2026年. Both sides are
// brought to plain integers before comparing, so only real differences are shown.

const DIGITS = '〇一二三四五六七八九';
const SMALL = { 十: 10, 百: 100, 千: 1000 };
const BIG = { 万: 1e4, 億: 1e8 };
const ERA = { 令和: 2018, 平成: 1988, 昭和: 1925 };

/** Kanji digits to 0–9, full-width to ASCII, and 18、417 / 18,417 to 18417. */
function normalize(/** @type {string} */ s) {
	return s
		.normalize('NFKC')
		.replace(/[〇○一二三四五六七八九]/g, (c) => String(c === '○' ? 0 : DIGITS.indexOf(c)))
		.replace(/(\d)[,、]\s*(?=\d{3}(?!\d))/g, '$1');
}

/** '150万' → 1500000, '44万7千' → 447000, '2百9十' (二百九十) → 290 */
function parseRun(/** @type {string} */ run) {
	let total = 0;
	let section = 0;
	let digit = 0;
	for (const [, n, u] of run.matchAll(/(\d+(?:\.\d+)?)|([十百千万億])/g)) {
		if (n) digit = Number(n);
		else if (u in SMALL) {
			section += (digit || 1) * SMALL[/** @type {keyof SMALL} */ (u)];
			digit = 0;
		} else {
			total += (section + digit || 1) * BIG[/** @type {keyof BIG} */ (u)];
			section = digit = 0;
		}
	}
	return String(Math.round((total + section + digit) * 1000) / 1000);
}

const RUN = /(?:\d+(?:\.\d+)?|[十百千万億])+/g;

/** Every number the source mentions, as strings. */
export function sourceNumbers(/** @type {string} */ source) {
	const text = normalize(source.replace(/\s+/g, ''));
	const found = new Set((text.match(RUN) ?? []).map(parseRun));
	for (const m of text.matchAll(/(令和|平成|昭和)(元|[\d十]+)年/g)) {
		found.add(String(ERA[/** @type {keyof ERA} */ (m[1])] + (m[2] === '元' ? 1 : Number(parseRun(m[2])))));
	}
	return found;
}

/** Numbers in `draft` that aren't in the source set, in order, without repeats. */
export function missingNumbers(/** @type {string} */ draft, /** @type {Set<string>} */ inSource) {
	const runs = (normalize(draft).match(RUN) ?? []).filter((r) => /\d/.test(r));
	return [...new Set(runs.map(parseRun))].filter((n) => !inSource.has(n));
}
