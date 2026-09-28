// Text helpers for Japanese government documents.

const CJK = '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}ー々〆、。・「」『』（）［］【】〈〉＜＞，．：；！？０-９Ａ-Ｚａ-ｚ';
const CJK_GAP = new RegExp(`(?<=[${CJK}])[ \\t\\u3000]+(?=[${CJK}])`, 'gu');

// PDF extraction of vertical or justified text puts a space between every character.
/** @param {string} s */
export function stripCjkSpaces(s) {
	return s.replace(CJK_GAP, '');
}

/** @param {string} s */
export function squash(s) {
	return s.replace(/\s+/g, ' ').trim();
}

// Key for comparing titles across sources: ignores spacing, width and bracket style.
/** @param {string} s */
export function titleKey(s) {
	return s.normalize('NFKC').replace(/\s+/g, '').replace(/[()（）「」]/g, '');
}

const KANJI_DIGITS = { 〇: 0, 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const KANJI_UNITS = { 十: 10, 百: 100, 千: 1000 };

// Accepts ASCII, full-width or kanji numerals (百六十四 → 164, ８４ → 84, 元 → 1).
/** @param {string} s */
export function toNumber(s) {
	const t = s.normalize('NFKC').trim();
	if (/^\d+$/.test(t)) return Number(t);
	if (t === '元') return 1;
	let total = 0;
	let digit = 0;
	for (const ch of t) {
		if (ch in KANJI_DIGITS) digit = KANJI_DIGITS[/** @type {keyof typeof KANJI_DIGITS} */ (ch)];
		else if (ch in KANJI_UNITS) {
			total += (digit || 1) * KANJI_UNITS[/** @type {keyof typeof KANJI_UNITS} */ (ch)];
			digit = 0;
		} else return NaN;
	}
	return total + digit;
}

const NUM = '[0-9０-９〇零一二三四五六七八九十百千元]+';
const REIWA_DATE = new RegExp(`令和\\s*(${NUM})\\s*年\\s*(${NUM})\\s*月\\s*(${NUM})\\s*日`);

// 令和８年９月９日 / 令和八年九月十八日 → 2026-09-09. Returns the first date found, or null.
/** @param {string} s */
export function parseReiwaDate(s) {
	const m = stripCjkSpaces(s).match(REIWA_DATE);
	if (!m) return null;
	const [y, mo, d] = [toNumber(m[1]) + 2018, toNumber(m[2]), toNumber(m[3])];
	if ([y, mo, d].some(Number.isNaN)) return null;
	return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// 「令和8年第3回定例会」 → { year: 2026, n: 3 }
/** @param {string} name */
export function parseSessionName(name) {
	const m = name.normalize('NFKC').match(/令和(\d+|元)年第(\d+)回(定例会|臨時会)/);
	if (!m) return null;
	return { year: toNumber(m[1]) + 2018, n: Number(m[2]), kind: m[3] };
}
