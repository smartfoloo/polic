// Which bills go live, and why the rest are held. Shared by `npm run review`, `npm run translate`
// and (Step 6) the site build, so all three agree. See REVIEW.md for the policy.

import { createHash } from 'node:crypto';
import { assemblies } from '../../src/lib/config/assemblies.js';

/** @typedef {'reviewed' | 'auto' | 'held'} PublishState */

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Why an unapproved bill can't go live on its own. Empty means it can.
 * AI "omission" notes don't hold a bill: they mean incomplete, not wrong.
 * @param {any} bill
 * @param {string} [date] ISO date, for the election window
 * @returns {string[]}
 */
export function holdReasons(bill, date = today()) {
	const election = assemblies.find((a) => a.id === bill.assembly)?.election;
	if (election && election.notice <= date && date <= election.day) return ['election period: review everything'];
	if (bill.titleOnly) return [];
	if (!bill.draft) return ['no draft yet'];
	if (!bill.checks || bill.checks.draftAt !== bill.draft.generatedAt) return ['not checked yet (npm run verify)'];

	const reasons = [];
	if (bill.by === 'member') reasons.push('member bill: always reviewed');
	reasons.push(...bill.checks.flags.map((/** @type {string} */ f) => `code: ${f}`));
	for (const i of bill.checks.issues) {
		if (i.kind !== 'omission') reasons.push(`ai [${i.severity}] ${i.field}/${i.kind}: 「${i.quote}」 → ${i.note}`);
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
