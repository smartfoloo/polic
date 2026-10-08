// Shared bill-facts helpers used by every adapter. Facts come only from parsed sources.

import { parseReiwaDate, stripCjkSpaces, toNumber } from './text.js';

/**
 * @typedef {object} Source
 * @property {string} label
 * @property {string} url
 * @property {string} fetchedAt
 */

/**
 * @typedef {object} BillFacts
 * @property {string} id
 * @property {string} assembly
 * @property {string} number
 * @property {string} official
 * @property {'head' | 'member'} by
 * @property {string} session
 * @property {string | null} committee
 * @property {number} stage 0 提案 · 1 委員会 · 2 本会議 · 3 決定/否決 · 4 実施 (matches the design's stepper)
 * @property {'提案中' | '審議中' | '決定' | '否決'} status
 * @property {'提案' | '可決' | '否決'} dateKind
 * @property {string | null} date ISO date
 * @property {boolean} [titleOnly] no text is published, so no summary can be written
 * @property {Source[]} sources
 */

/**
 * What an adapter hands back: facts plus the source text the drafting step will read.
 * The text stays in cache/ and is never committed (it is the assemblies' copyrighted prose).
 * @typedef {object} Collected
 * @property {BillFacts} facts
 * @property {string} input
 */

// v1 scope: ordinances only. Budgets, contracts, reports, appointments, 意見書 etc. are skipped.
// Some Tama cities title them 「…条例設定について」 (八王子) or 「…条例の制定について」; Kanagawa adds
// 「…条例の一部改正について」 (海老名, 逗子), 「…条例の制定」/「…条例の一部改正」 (横浜) and 「…条例を制定すること
// について」/「…条例等の一部を改正することについて」 (秦野); 国分寺 ends 「…条例について」. 専決処分 never ends
// this way, so it stays out.
/** @param {string} title */
export function inScope(title) {
	return /条例(等)?(案|設定について|について|の制定(について)?|の一部改正(について)?|の廃止(について)?|を(制定|廃止)することについて|の一部を改正することについて)?$/.test(
		title.normalize('NFKC').trim()
	);
}

/**
 * @param {string} result the result cell, empty while pending
 * @param {boolean} referred whether the bill has been sent to a committee. 継続審査 is always in committee.
 * @returns {{ status: BillFacts['status'], stage: number } | null} null for results we don't recognise
 */
export function statusFrom(result, referred) {
	const r = result.replace(/\s/g, '');
	if (/継続/.test(r)) return { status: '審議中', stage: 1 };
	if (!r) return referred ? { status: '審議中', stage: 1 } : { status: '提案中', stage: 0 };
	if (/否決/.test(r)) return { status: '否決', stage: 3 };
	if (/可決/.test(r)) return { status: '決定', stage: 3 };
	return null;
}

// The submission date sits right after 「…議案を提出する。」 (or 「提出します。」) or right before 「提出」. A
// Western year in brackets, 「令和８年(2026年)６月８日」, is dropped.
/** @param {string} pdfText */
export function submittedDate(pdfText) {
	const t = stripCjkSpaces(pdfText).replace(/[(（]\s*\d{4}\s*年\s*[)）]/g, '');
	const after = t.match(/提出(?:する|し\s*ます)。?\s*(令和.{1,12}?日)/);
	if (after) return parseReiwaDate(after[1]);
	const before = t.match(/(令和.{1,12}?日)\s*提出/);
	return before ? parseReiwaDate(before[1]) : null;
}

/**
 * Stable id: <assembly slug>-r<reiwa year>-<session no>-<bill no>, with an m prefix for member bills.
 * 臨時会 get an x before the session number (第1回臨時会 → x1), since their numbering overlaps 定例会.
 * @param {string} assemblyId
 * @param {{ year: number, n: number, kind?: string }} session
 * @param {number} billNo
 * @param {'head' | 'member'} by
 * @param {string} [series] for assemblies numbering several series separately (横浜: 市/水/交/病 第N号議案)
 */
export function billId(assemblyId, session, billNo, by, series = '') {
	const slug = assemblyId.split('/').pop();
	const sn = session.kind === '臨時会' ? `x${session.n}` : session.n;
	return `${slug}-r${session.year - 2018}-${sn}-${by === 'member' ? 'm' : ''}${series}${billNo}`;
}

/**
 * Bill numbers as the Tama cities write them: 議案第36号 / 第55号議案 / 第35号議案 (head) ·
 * 議員提出議案第1号 / 議員提出第1号議案 / 議提議案第2号 (member) · 委員会提出議案第1号 (committee). Notes such
 * as 「（※）」 are ignored. Anything else (報告, 同意, 諮問) is null.
 * @returns {{ by: 'head' | 'member' | 'committee', n: number, label: string } | null}
 */
export function parseBillNumber(/** @type {string} */ text) {
	const label = text.normalize('NFKC').replace(/\s+/g, '').replace(/\(.*?\)|※/g, '');
	const m = label.match(/^(議員提出|議提|委員会提出)?(?:議案)?第(\d+)号(?:議案)?$/);
	if (!m) return null;
	return { by: m[1] === '議員提出' || m[1] === '議提' ? 'member' : m[1] ? 'committee' : 'head', n: Number(m[2]), label };
}

// 「立川市景観条例の一部を改正する条例 （PDF 42.4 KB）」 / 「… [PDFファイル／644KB]」 → the title alone.
/** @param {string} s */
export function stripFileNote(s) {
	return s
		.normalize('NFKC')
		.replace(/[(（[]\s*(PDF|Word|Excel)[^)）\]]*[)）\]]/gi, '')
		.replace(/[\u200b\s]+/g, ' ')
		.trim();
}

/**
 * Facts from a result: 可決/否決 with a vote date, or still under way. The date is the vote date once
 * decided, otherwise the submission date (from the bill PDF) when known.
 * @param {string} result result text, may include a 令和 date
 * @param {string | null} committee
 * @param {string | null} submitted ISO date
 * @param {string | null} [voteDate] ISO date when it sits apart from the result text
 * @param {{ committeeUnknown?: boolean }} [opts] committeeUnknown: the source doesn't say which committee (or
 *   whether any) has a pending bill, so treat it as referred rather than merely submitted
 * @returns {Pick<BillFacts, 'status' | 'stage' | 'dateKind' | 'date'> | null}
 */
export function outcome(result, committee, submitted, voteDate = null, { committeeUnknown = false } = {}) {
	const st = statusFrom(result.replace(/令和.{1,12}?日/, ''), committee !== null || committeeUnknown);
	if (!st) return null;
	const voted = st.stage === 3 ? (voteDate ?? parseReiwaDate(result)) : null;
	return { ...st, dateKind: voted ? (st.status === '否決' ? '否決' : '可決') : '提案', date: voted ?? submitted };
}

/**
 * Splits a bundle of bills (one PDF holding 第59号議案 to 第66号議案) into one text per bill, cutting at each
 * line that is only a bill heading: 「第 59 号議案」, 「議案第59号」, 「第五十九号議案」, 「議員提出第４号議案」. Headings inside the
 * text (「第59号議案の…」) don't stand alone on a line, so they don't cut.
 * @param {string} text
 * @returns {Map<number, string>} bill number → its text, heading included
 */
export function splitBills(text) {
	/** @type {Map<number, string>} */
	const out = new Map();
	const heading = /^\s*(?:議員提出|委員会提出)?\s*(?:議案\s*)?第\s*([0-9０-９〇一二三四五六七八九十百]+)\s*号\s*(?:議案)?\s*$/;
	/** @type {number | null} */
	let current = null;
	/** @type {string[]} */
	let lines = [];
	const flush = () => {
		if (current !== null) out.set(current, (out.get(current) ?? '') + lines.join('\n'));
	};
	for (const line of text.split('\n')) {
		const m = line.match(heading);
		if (m) {
			flush();
			current = toNumber(m[1]);
			lines = [];
		}
		lines.push(line);
	}
	flush();
	return out;
}
