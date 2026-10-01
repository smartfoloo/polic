// Everything the checks raised on a bill, as one list for the review page: the AI checker's issues,
// the code checks (scripts/lib/checks.js, stored as strings) and the hold reasons that aren't checks.

/** @typedef {'error' | 'warn' | 'info' | 'muted'} Tone */
/**
 * @typedef {{ note: string, at?: string }} Dismissal
 * @typedef {{ flag: string } | { issue: number }} FlagRef which stored check a flag came from, for undoing a dismissal
 * @typedef {{ kind: string, field?: string, quote?: string, note: string, sure?: boolean, dismissed?: Dismissal, ref?: FlagRef }} Flag
 */

/** Sorted most serious first. */
export const KINDS = /** @type {Record<string, { label: string, tone: Tone }>} */ ({
	fact: { label: 'Fact', tone: 'error' },
	direction: { label: 'Direction', tone: 'error' },
	unsupported: { label: 'Not in source', tone: 'error' },
	name: { label: 'Personal name', tone: 'error' },
	election: { label: 'Election period', tone: 'error' },
	tone: { label: 'Tone', tone: 'warn' },
	number: { label: 'Number', tone: 'warn' },
	table: { label: 'Broken table', tone: 'warn' },
	copied: { label: 'Copied', tone: 'warn' },
	attribution: { label: 'Attribution', tone: 'warn' },
	headline: { label: 'Headline length', tone: 'warn' },
	member: { label: 'Member bill', tone: 'info' },
	omission: { label: 'Missing (optional)', tone: 'muted' }
});

const RANK = Object.keys(KINDS);
const byRank = (/** @type {Flag} */ a, /** @type {Flag} */ b) => RANK.indexOf(a.kind) - RANK.indexOf(b.kind);
export const sortFlags = (/** @type {Flag[]} */ flags) => [...flags].sort(byRank);

export const FIELD_LABEL = /** @type {Record<string, string>} */ ({
	name: 'Headline',
	summary: 'Summary',
	changes: 'What changes',
	who: 'Who is affected',
	why: 'Why'
});

const squash = (/** @type {string} */ s) => s.replace(/\s+/g, '');

/** The fields whose text contains `quote` (whitespace ignored), for code flags that don't say. */
function fieldsWith(/** @type {any} */ bill, /** @type {string} */ quote) {
	const found = Object.keys(FIELD_LABEL).filter((k) => squash([bill[k] ?? ''].flat().join('')).includes(squash(quote)));
	return found.length ? found : [undefined];
}

/** @returns {Flag[]} */
function codeFlags(/** @type {any} */ bill, /** @type {string} */ f) {
	if (f.startsWith('copied from the source')) {
		const quote = f.match(/「(.+)」/)?.[1] ?? '';
		const note = 'Copied word for word from the source. Rewrite it in our own words (official names and legal terms are fine).';
		return fieldsWith(bill, quote).map((field) => ({ kind: 'copied', field, quote, note }));
	}
	const flag = codeFlag(f);
	return flag ? [flag] : [];
}

/** @returns {Flag | null} */
function codeFlag(/** @type {string} */ f) {
	if (f.startsWith('source has a garbled')) {
		return { kind: 'table', note: 'A before/after table lost its contents in the PDF text, so old and new values may be swapped. Check the direction of each change against the PDF.' };
	}
	if (f.startsWith('reason is not attributed')) {
		return { kind: 'attribution', field: 'why', note: 'The reason must be the proposer’s: end it 「…と、区は説明しています。」, 「…と、都知事は説明しています。」 or 「…と、提出した議員は説明しています。」.' };
	}
	if (f.startsWith('headline is')) return { kind: 'headline', field: 'name', note: `The ${f.replace(' (aim for about 25)', '')}; aim for about 25.` };
	return null;
}

/**
 * @param {any} bill
 * @param {string[]} [reasons] hold reasons from publish.js, for the ones that aren't checks
 * @returns {Flag[]}
 */
export function flagsOf(bill, reasons = []) {
	/** @type {Flag[]} */
	const flags = [];
	if (reasons.some((r) => r.startsWith('election period'))) flags.push({ kind: 'election', note: 'The assembly’s election window is open: every bill needs your approval.' });
	if (reasons.includes('member bill: always reviewed')) flags.push({ kind: 'member', note: 'Bills from assembly members are always checked by a person.' });
	const dismissedFlags = new Map((bill.checks?.dismissedFlags ?? []).map((/** @type {any} */ d) => [d.flag, d]));
	// A phrase copied twice is flagged twice by the code check: keep one flag per field.
	for (const f of new Set(/** @type {string[]} */ (bill.checks?.flags ?? []))) {
		const d = dismissedFlags.get(f);
		flags.push(...codeFlags(bill, f).map((x) => ({ ...x, ref: { flag: f }, dismissed: d && { note: d.note } })));
	}
	(bill.checks?.issues ?? []).forEach((/** @type {any} */ i, /** @type {number} */ n) => {
		flags.push({ kind: i.kind, field: i.field, quote: i.quote, note: i.note, sure: i.severity === 'error', ref: { issue: n }, dismissed: i.dismissed });
	});
	return sortFlags(flags);
}

/** Kinds and counts for the bill list, e.g. [{ kind: 'fact', n: 2 }]. */
export function summarize(/** @type {Flag[]} */ flags) {
	/** @type {Map<string, number>} */
	const counts = new Map();
	for (const f of flags) if (!f.dismissed) counts.set(f.kind, (counts.get(f.kind) ?? 0) + 1);
	return [...counts].map(([kind, n]) => ({ kind, n }));
}

/** Splits a note so 「quoted terms」 and article numbers (第五十一条の二) can be searched in the source. */
export function noteParts(/** @type {string} */ note) {
	return note.split(/(「[^」]+」|第[〇一二三四五六七八九十百千]+条(?:の[一二三四五六七八九十]+)?)/).map((text, i) => ({
		text,
		find: i % 2 ? text.replace(/^「|」$/g, '') : null
	}));
}
