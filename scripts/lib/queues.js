// What a bill is waiting on from a person. Shared by `npm run review` and the admin page (/admin in
// dev), so both list the same bills in the same order. See REVIEW.md.

import { jaSource } from './prompts.js';
import { holdReasons, inSample, publishState } from './publish.js';

export const QUEUES = /** @type {const} */ ([
	{ id: 'held', label: 'Held', hint: 'Fix and approve, or it stays off the site' },
	{ id: 'sample', label: 'Spot check', hint: 'Live but unchecked, in the 1-in-10 sample: read and approve' },
	{ id: 'facts', label: 'Facts changed', hint: 'Approved, then collect found new facts: recheck the summary' },
	{ id: 'en', label: 'English to review', hint: 'Compare with the Japanese' },
	{ id: 'enStale', label: 'English out of date', hint: 'The Japanese changed: retranslate' },
	{ id: 'improve', label: 'Could be more complete', hint: 'Live but unchecked; the checker noted missing changes (optional)' },
	{ id: 'waiting', label: 'Waiting for AI', hint: 'Not drafted or not checked yet: npm run draft / verify' }
]);

/** @typedef {(typeof QUEUES)[number]['id']} QueueId */

const WAITING = ['no draft yet', 'not checked yet (npm run verify)'];

/**
 * @param {any} bill
 * @returns {{ state: import('./publish.js').PublishState, reasons: string[], queues: QueueId[] }}
 */
export function reviewStatus(bill) {
	const state = publishState(bill);
	const reasons = state === 'held' ? holdReasons(bill) : [];
	/** @type {QueueId[]} */
	const queues = [];

	if (state === 'held') {
		queues.push(reasons.every((r) => WAITING.includes(r)) ? 'waiting' : 'held');
		return { state, reasons, queues };
	}
	if (state === 'auto') {
		if (inSample(bill.id) && !bill.titleOnly) queues.push('sample');
		if ((bill.checks?.issues ?? []).some((/** @type {any} */ i) => i.kind === 'omission' && !i.dismissed)) queues.push('improve');
	}
	if (state === 'reviewed' && bill.factsUpdated) queues.push('facts');
	if (!bill.en || bill.en.sourceHash !== jaSource(bill).hash) queues.push('enStale');
	else if (!bill.en.approved) queues.push('en');
	return { state, reasons, queues };
}
