// Which bills go live, and why the rest are held. Shared by `npm run review`, `npm run translate`
// and (Step 6) the site build, so all three agree. See REVIEW.md for the policy.

import { createHash } from 'node:crypto';
import { assemblies } from '../../src/lib/config/assemblies.js';

/** @typedef {'reviewed' | 'auto' | 'held'} PublishState */

const today = () => new Date().toISOString().slice(0, 10);

/** The assembly's election whose window (notice date through election day) contains `date`, if any. */
export const inElection = (/** @type {string} */ assembly, date = today()) =>
	assemblies.find((a) => a.id === assembly)?.elections.find((e) => e.notice <= date && date <= e.day);

/**
 * Why an unapproved bill can't go live on its own. Empty means it can.
 * AI "omission" notes don't hold a bill: they mean incomplete, not wrong.
 * @param {any} bill
 * @param {string} [date] ISO date, for the election window
 * @returns {string[]}
 */
export function holdReasons(bill, date = today()) {
	const election = inElection(bill.assembly, date);
	if (election) return [`election period (${election.what}): review everything`];
	if (bill.titleOnly) return [];
	if (!bill.draft) return ['no draft yet'];
	if (!bill.checks || bill.checks.draftAt !== bill.draft.generatedAt) return ['not checked yet (npm run verify)'];

	// Flags someone looked at and dismissed as wrong (checks.dismissedFlags, issue.dismissed) don't hold.
	const dismissed = new Set((bill.checks.dismissedFlags ?? []).map((/** @type {any} */ d) => d.flag));
	const reasons = [];
	if (bill.by === 'member') reasons.push('member bill: always reviewed');
	reasons.push(...bill.checks.flags.filter((/** @type {string} */ f) => !dismissed.has(f)).map((/** @type {string} */ f) => `code: ${f}`));
	for (const i of bill.checks.issues) {
		if (i.kind !== 'omission' && !i.dismissed) reasons.push(`ai [${i.severity}] ${i.field}/${i.kind}: 「${i.quote}」 → ${i.note}`);
	}
	return reasons;
}

/**
 * @param {any} bill
 * @param {string} [date]
 * @returns {PublishState}
 */
export function publishState(bill, date = today()) {
	if (bill.approved) return 'reviewed';
	return holdReasons(bill, date).length ? 'held' : 'auto';
}

/** About 1 in 10 bills, fixed by id, for spot-checking bills that went live unchecked. */
export function inSample(/** @type {string} */ id) {
	return createHash('sha1').update(id).digest()[0] % 10 === 0;
}
