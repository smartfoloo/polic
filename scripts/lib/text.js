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

// Session names → { year, n, kind }; ids use them, so every format must give a stable, unique n.
// 「令和8年第3回定例会」 → n 3; spacing is ignored (「令和8年　第3回　定例会」).
// 「令和8年9月定例会（第3回）」 (町田) → n 3, the 回 number wins over the month.
// 「令和8年9月定例会」 (named by month only: 東村山, 小平) → n 9.
// Year-long sessions name each meeting instead, and their bill numbers restart each (fiscal) year:
// 「令和8年度定例会9月議会」 (墨田) → n 9. 「令和7年市議会定例会令和8年2月定例議会」 (青梅, May–April) → year
// 2025, n 2.
/** @param {string} name */
export function parseSessionName(name) {
	const t = name.normalize('NFKC').replace(/\s+/g, '');
	const year = (/** @type {string} */ y) => toNumber(y) + 2018;
	// 「令和8年9月第3回定例会」 (海老名) also counts by 回.
	const m = t.match(/令和(\d+|元)年(?:\d+月)?(定例会|臨時会)\(第(\d+)回\)/) ?? t.match(/令和(\d+|元)年(?:\d+月)?第(\d+)回(定例会|臨時会)$/);
	if (m) return m[3].match(/^\d+$/) ? { year: year(m[1]), n: Number(m[3]), kind: m[2] } : { year: year(m[1]), n: Number(m[2]), kind: m[3] };
	// 秦野 (year-long session): 「令和8年6月第2回定例月会議」, 「令和8年7月第1回臨時会議」.
	const hadano = t.match(/令和(\d+|元)年\d+月第(\d+)回(定例月|臨時)会議$/);
	if (hadano) return { year: year(hadano[1]), n: Number(hadano[2]), kind: hadano[3] === '臨時' ? '臨時会' : '定例会' };
	// 相模原 (year-long session from April): 「令和8年定例会6月定例会議」, 「…第1回臨時会議」, and the opening
	// 「…開会会議」 as n 0.
	const sagamihara = t.match(/令和(\d+|元)年定例会(?:(\d+)月定例会議|第(\d+)回臨時会議|(開会)会議)$/);
	if (sagamihara) return { year: year(sagamihara[1]), n: Number(sagamihara[2] ?? sagamihara[3] ?? 0), kind: sagamihara[3] ? '臨時会' : '定例会' };
	// あきる野: a year-long 定例会 meets as 「3月定例会議」, 「第1回臨時会議」 and an opening 「開会会議」, and bill
	// numbers run through the year. 開会会議 takes the 回 number as n (meetings are in months 3 and later).
	const meeting = t.match(/令和(\d+|元)年第(\d+)回定例会(?:(\d+)月定例会議|第(\d+)回臨時会議|(開会)会議)$/);
	if (meeting) return { year: year(meeting[1]), n: Number(meeting[3] ?? meeting[4] ?? meeting[2]), kind: meeting[4] ? '臨時会' : '定例会' };
	// 文京 names them 「令和8年6月定例議会」 / 「令和8年7月臨時議会」.
	const month = t.match(/令和(\d+|元)年(\d+)月(定例|臨時)(会|議会)$/);
	if (month) return { year: year(month[1]), n: Number(month[2]), kind: `${month[3]}会` };
	const y = t.match(/令和(\d+|元)年度定例会(\d+)月議会/) ?? t.match(/令和(\d+|元)年市議会定例会(?:令和\d+年)?(\d+)月(?:定例|招集|臨時)議会/);
	return y ? { year: year(y[1]), n: Number(y[2]), kind: '定例会' } : null;
}
