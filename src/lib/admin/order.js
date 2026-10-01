/**
 * @typedef {{ id: string, assembly: string, name: string, state: string, queues: string[], flags: { kind: string, n: number }[] }} AdminBill
 * @typedef {{ id: string, label: string, hint: string }} AdminQueue
 */

const byId = (/** @type {AdminBill} */ a, /** @type {AdminBill} */ b) => a.id.localeCompare(b.id, 'en', { numeric: true });

/** Bills grouped under their first (most important) queue, in list order. */
export function groupByQueue(/** @type {AdminBill[]} */ bills, /** @type {readonly AdminQueue[]} */ queues) {
	return queues.map((q) => ({ ...q, items: bills.filter((b) => b.queues[0] === q.id).sort(byId) }));
}

/** The review order for Next: every queue except Waiting for AI. */
export function reviewOrder(/** @type {AdminBill[]} */ bills, /** @type {readonly AdminQueue[]} */ queues) {
	return groupByQueue(bills, queues)
		.filter((g) => g.id !== 'waiting')
		.flatMap((g) => g.items);
}
