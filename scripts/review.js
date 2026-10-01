// Lists what is waiting for you. Read-only: it changes nothing. The admin page (/admin, with
// npm run dev) shows the same queues with the source text next to each draft.
// Usage: npm run review [-- <text to filter ids by, e.g. suginami or tokyo-r8-3>]

import { loadBills } from './lib/bills-io.js';
import { QUEUES, reviewStatus } from './lib/queues.js';
import { textPath } from './lib/store.js';

const filter = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '';

/** @type {Record<string, string[]>} */
const rows = Object.fromEntries(QUEUES.map((q) => [q.id, []]));
const counts = { reviewed: 0, auto: 0, held: 0 };
const indent = ' '.repeat(23);

for (const { bill } of await loadBills()) {
	if (filter && !bill.id.includes(filter)) continue;
	const { state, reasons, queues } = reviewStatus(bill);
	counts[state]++;
	const head = `${bill.id.padEnd(20)} ${bill.titleOnly ? bill.official : (bill.name ?? bill.official)}`;

	for (const q of queues) {
		if (q === 'held') {
			rows.held.push([head, ...reasons.map((r) => indent + r), `${indent}${textPath(bill.id)} · ${bill.sources.at(-1)?.url ?? ''}`].join('\n'));
		} else if (q === 'improve') {
			const notes = bill.checks.issues.filter((/** @type {any} */ i) => i.kind === 'omission' && !i.dismissed);
			rows.improve.push([head, ...notes.map((/** @type {any} */ i) => `${indent}${i.note}`)].join('\n'));
		} else if (q === 'facts') {
			rows.facts.push(`${head}  (changed ${bill.factsUpdated})`);
		} else {
			rows[q].push(head);
		}
	}
}

for (const q of QUEUES) {
	const list = rows[q.id];
	if (!list.length) continue;
	console.log(`\n${q.label}: ${q.hint} (${list.length})`);
	// Waiting bills are for the scripts, not for you: show the count only.
	if (q.id !== 'waiting') for (const r of list) console.log(`  ${r}`);
}
console.log(`\nLive: ${counts.reviewed} reviewed, ${counts.auto} unchecked · Held: ${counts.held}${filter ? ` (filter: ${filter})` : ''}`);
