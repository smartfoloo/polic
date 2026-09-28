// Shared bill-facts helpers used by every adapter. Facts come only from parsed sources.

import { parseReiwaDate, stripCjkSpaces } from './text.js';

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
/** @param {string} title */
export function inScope(title) {
	return /条例(案)?$/.test(title.trim());
}

/**
 * @param {string} result the result cell, empty while pending
 * @param {boolean} referred whether the bill has been sent to a committee
 * @returns {{ status: BillFacts['status'], stage: number } | null} null for results we don't recognise
 */
export function statusFrom(result, referred) {
	const r = result.replace(/\s/g, '');
	if (!r || /継続/.test(r)) return referred ? { status: '審議中', stage: 1 } : { status: '提案中', stage: 0 };
	if (/否決/.test(r)) return { status: '否決', stage: 3 };
	if (/可決/.test(r)) return { status: '決定', stage: 3 };
	return null;
}

// The submission date sits right after 「…議案を提出する。」 or right before 「提出」.
/** @param {string} pdfText */
export function submittedDate(pdfText) {
	const t = stripCjkSpaces(pdfText);
	const after = t.match(/提出する。?\s*(令和.{1,12}?日)/);
	if (after) return parseReiwaDate(after[1]);
	const before = t.match(/(令和.{1,12}?日)\s*提出/);
	return before ? parseReiwaDate(before[1]) : null;
}

/**
 * Stable id: <assembly slug>-r<reiwa year>-<session no>-<bill no>, with an m prefix for member bills.
 * @param {string} assemblyId
 * @param {{ year: number, n: number }} session
 * @param {number} billNo
 * @param {'head' | 'member'} by
 */
export function billId(assemblyId, session, billNo, by) {
	const slug = assemblyId.split('/').pop();
	return `${slug}-r${session.year - 2018}-${session.n}-${by === 'member' ? 'm' : ''}${billNo}`;
}
