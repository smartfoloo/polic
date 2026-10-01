/**
 * @typedef {{ id: string, assembly: string, name: string, state: string, queues: string[], flags: { kind: string, n: number }[] }} AdminBill
 * @typedef {{ id: string, group: string, label: string, hint: string }} AdminQueue
 */

const byId = (/** @type {AdminBill} */ a, /** @type {AdminBill} */ b) => a.id.localeCompare(b.id, 'en', { numeric: true });

/** Bills grouped under their first (most important) queue, in list order. */
export function groupByQueue(/** @type {AdminBill[]} */ bills, /** @type {readonly AdminQueue[]} */ queues) {
	return queues.map((q) => ({ ...q, items: bills.filter((b) => b.queues[0] === q.id).sort(byId) }));
}

/** The order for Next: the to-do queues, or the optional ones when you're already in them. */
export function reviewOrder(/** @type {AdminBill[]} */ bills, /** @type {readonly AdminQueue[]} */ queues, group = 'todo') {
	return groupByQueue(bills, queues)
		.filter((g) => g.group === group)
		.flatMap((g) => g.items);
}
