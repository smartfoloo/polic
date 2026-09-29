// Plain substring search over live bills. Text is compared after NFKC + lowercase, so
// 「２０２６」 matches 「2026」 and ＡＢＣ matches abc; hits map back to the original text for highlighting.

/** @returns {{ text: string, map: number[] }} map[i] = index in the original of normalized char i */
function normalize(/** @type {string} */ s) {
	let text = '';
	const map = [];
	for (let i = 0; i < s.length; i++) {
		const n = s[i].normalize('NFKC').toLowerCase();
		text += n;
		for (let k = 0; k < n.length; k++) map.push(i);
	}
	return { text, map };
}

export const normQuery = (/** @type {string} */ q) => q.normalize('NFKC').toLowerCase().trim();

/** @returns {[number, number] | null} start and end of the first match in the original string */
export function find(/** @type {string} */ s, /** @type {string} */ nq) {
	if (!nq) return null;
	const { text, map } = normalize(s);
	const i = text.indexOf(nq);
	return i < 0 ? null : [map[i], map[i + nq.length - 1] + 1];
}

/**
 * Splits text into plain and highlighted parts around the first match, trimmed to about `len`
 * characters around it when `len` is set.
 * @returns {{ text: string, hit: boolean }[]}
 */
export function highlight(/** @type {string} */ s, /** @type {string} */ nq, len = 0) {
	const m = find(s, nq);
	let [from, to] = [0, s.length];
	if (len && s.length > len) {
		from = m ? Math.max(0, m[0] - 20) : 0;
		to = Math.min(s.length, from + len);
	}
	const pre = from > 0 ? '…' : '';
	const post = to < s.length ? '…' : '';
	if (!m || m[1] > to) return [{ text: pre + s.slice(from, to) + post, hit: false }];
	return [
		{ text: pre + s.slice(from, m[0]), hit: false },
		{ text: s.slice(m[0], m[1]), hit: true },
		{ text: s.slice(m[1], to) + post, hit: false }
	];
}
