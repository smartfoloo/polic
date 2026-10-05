// Bill helpers shared by every page. Labels and notes here are built from parsed facts, never the LLM.

import { t, committeeLabel, fmtDate } from './i18n.js';

/**
 * What the site gets for a live bill: facts, the Japanese text and (only when approved and current)
 * the English. Built in src/lib/server/data.js; held bills never reach the page.
 * @typedef {object} PublicBill
 * @property {string} id
 * @property {string} assembly
 * @property {string} number
 * @property {string} official
 * @property {'head' | 'member'} by
 * @property {string} session
 * @property {string} [committee]
 * @property {number} stage
 * @property {'提案中' | '審議中' | '決定' | '否決'} status
 * @property {string} dateKind
 * @property {string | null} date null when the source gives none (Tokyo member bills)
 * @property {boolean} titleOnly
 * @property {boolean} reviewed a person approved the Japanese
 * @property {{ label: string, url: string }[]} sources
 * @property {string} [name]
 * @property {string} [category]
 * @property {string} [summary]
 * @property {string[]} [changes]
 * @property {string[]} [who]
 * @property {string} [why]
 * @property {{ reviewed: boolean, name?: string, official: string, summary?: string, changes?: string[], who?: string[], why?: string } | null} en
 *   English, only when it matches the current Japanese; reviewed = a person checked the translation
 */

/**
 * What the board needs for one card (the popup loads the full bill).
 * @typedef {Pick<PublicBill, 'id' | 'assembly' | 'number' | 'by' | 'session' | 'stage' | 'status' | 'date' | 'titleOnly' | 'official' | 'name' | 'category'>
 *   & { en: { name?: string, official: string } | null, noEffect: boolean }} BillCard
 *   noEffect: summarised, and nobody listed as affected (sinks to the bottom of the board)
 */

/** @returns {BillCard} */
export const toCard = (/** @type {PublicBill} */ b) => ({
	id: b.id,
	assembly: b.assembly,
	number: b.number,
	by: b.by,
	session: b.session,
	stage: b.stage,
	status: b.status,
	date: b.date,
	titleOnly: b.titleOnly,
	official: b.official,
	name: b.name,
	category: b.category,
	en: b.en && { name: b.en.name, official: b.en.official },
	noEffect: !b.titleOnly && !b.who?.length
});

/**
 * @typedef {object} PublicAssembly
 * @property {string} id
 * @property {string} name
 * @property {string} nameEn
 * @property {string} place
 * @property {string} placeEn
 * @property {string} head
 * @property {string} headEn
 * @property {'pref' | 'muni'} level
 * @property {string} [parent]
 * @property {import('./config/assemblies.js').Session[]} sessions
 * @property {import('./config/assemblies.js').Gap[]} gaps
 */

export const billPath = (/** @type {{ id: string, assembly: string }} */ b) => `/${b.assembly}/bills/${b.id}`;

/** Headline for cards and titles; title-only bills have no plain-language name. */
export const billName = (/** @type {BillCard | PublicBill} */ b) =>
	b.titleOnly ? t(b.official, b.en?.official ?? b.official) : t(b.name ?? b.official, b.en?.name ?? b.name ?? b.official);

/** Same shape and weight for both kinds of proposer (neutrality). */
export const proposer = (/** @type {{ by: string }} */ b, /** @type {PublicAssembly} */ a) =>
	b.by === 'head' ? t(`${a.head}の提案`, `${a.headEn}'s proposal`) : t('議員の提案', "Members' proposal");

/** One line under the stepper, e.g. 「保健福祉委員会で審議中です。」 */
export function stageNote(/** @type {PublicBill} */ b) {
	if (b.status === '否決') return t('本会議で否決されました。', 'Rejected in a plenary session.');
	if (b.status === '決定') {
		return b.dateKind === '可決' && b.date
			? t(`${fmtDate(b.date)}の本会議で可決されました。`, `Passed in a plenary session on ${fmtDate(b.date)}.`)
			: t('本会議で可決されました。', 'Passed in a plenary session.');
	}
	if (b.stage >= 2) return t('本会議での採決を待っています。', 'Waiting for the plenary vote.');
	if (b.stage === 1) {
		return b.committee
			? t(`${b.committee}で審議中です。`, `Under review in the ${committeeLabel(b.committee)}.`)
			: t('審議中です。付託された委員会は公表されていません。', "Under review. The committee it went to isn't published.");
	}
	return t('議会に提出されました。', 'Submitted to the assembly.');
}

/** Decided, but the source gives no vote date: the date shown is the submission date (labelled 提案). */
export const noVoteDate = (/** @type {PublicBill} */ b) => (b.status === '決定' || b.status === '否決') && b.dateKind === '提案';

/** Short session name for cards: 令和8年第3回定例会 → 第3回定例会, 令和8年度定例会9月議会 → 9月議会 */
export function sessionShort(/** @type {string} */ name, /** @type {PublicAssembly} */ a) {
	const s = a.sessions.find((x) => x.name === name);
	return t(name.replace(/^令和\d+年(度定例会)?/, ''), s ? s.nameEn.replace(/ \d{4}$/, '') : name);
}

/** @typedef {'before' | 'open' | 'closed'} SessionState */

/** @returns {SessionState} */
export function sessionState(/** @type {{ opened: string, closes: string }} */ s, /** @type {string} */ today) {
	if (today < s.opened) return 'before';
	return today <= s.closes ? 'open' : 'closed';
}

export const sessionStateLabel = (/** @type {SessionState} */ s) =>
	({ before: t('開会前', 'Not yet open'), open: t('開会中', 'In session'), closed: t('閉会', 'Closed') })[s];

const num = (/** @type {BillCard} */ b) => Number(b.number.match(/\d+/)?.[0] ?? 0);
const pending = (/** @type {BillCard} */ b) => b.status === '提案中' || b.status === '審議中';

/**
 * Board order (PLAN.md Decisions): still being decided, soonest vote first → decided, newest first →
 * no direct effect on residents. Ties by bill number. Facts only, no ranking.
 * @param {BillCard[]} bills
 * @param {PublicAssembly} assembly
 */
export function boardOrder(bills, assembly) {
	const session = (/** @type {BillCard} */ b) => assembly.sessions.find((s) => s.name === b.session);
	const closes = (/** @type {BillCard} */ b) => session(b)?.closes ?? '9999';
	const date = (/** @type {BillCard} */ b) => b.date ?? session(b)?.opened ?? '';
	const group = (/** @type {BillCard} */ b) => (b.noEffect ? 2 : pending(b) ? 0 : 1);
	return [...bills].sort((a, b) => {
		const g = group(a) - group(b);
		if (g) return g;
		if (pending(a) && pending(b)) return closes(a).localeCompare(closes(b)) || num(a) - num(b);
		return date(b).localeCompare(date(a)) || num(a) - num(b);
	});
}
