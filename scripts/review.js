// Lists what is waiting for you. Read-only: it changes nothing.
// Usage: npm run review [-- <text to filter ids by, e.g. suginami or tokyo-r8-3>]

import { loadBills } from './lib/bills-io.js';
import { jaSource } from './lib/prompts.js';
import { holdReasons, inSample, publishState } from './lib/publish.js';
import { textPath } from './lib/store.js';

const filter = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '';

/** @type {Record<string, string[]>} */
const queues = {
	'Held: fix and approve, or it stays off the site': [],
	'Live but unchecked, in the spot-check sample: read and approve': [],
	'Facts changed after approval: recheck, then delete "factsUpdated"': [],
	'English to review (compare with the Japanese)': [],
	'English out of date: run npm run translate': [],
	'Live but unchecked, could be more complete (optional)': []
};
const [held, sample, factsChanged, en, enStale, improve] = Object.values(queues);
const counts = { reviewed: 0, auto: 0, held: 0 };

for (const { bill } of await loadBills()) {
	if (filter && !bill.id.includes(filter)) continue;
	const state = publishState(bill);
	counts[state]++;
	const head = `${bill.id.padEnd(20)} ${bill.titleOnly ? bill.official : (bill.name ?? bill.official)}`;
	const indent = ' '.repeat(23);

	if (state === 'held') {
		held.push([head, ...holdReasons(bill).map((r) => indent + r), `${indent}${textPath(bill.id)} · ${bill.sources.at(-1)?.url ?? ''}`].join('\n'));
		continue;
	}
	if (state === 'auto') {
		if (inSample(bill.id) && !bill.titleOnly) sample.push(head);
		const notes = (bill.checks?.issues ?? []).filter((/** @type {any} */ i) => i.kind === 'omission');
		if (notes.length) improve.push([head, ...notes.map((/** @type {any} */ i) => `${indent}${i.note}`)].join('\n'));
	}
	if (state === 'reviewed' && bill.factsUpdated) factsChanged.push(`${head}  (changed ${bill.factsUpdated})`);
	if (!bill.en || bill.en.sourceHash !== jaSource(bill).hash) enStale.push(head);
	else if (!bill.en.approved) en.push(head);
}

for (const [title, rows] of Object.entries(queues)) {
	if (!rows.length) continue;
	console.log(`\n${title} (${rows.length})`);
	for (const r of rows) console.log(`  ${r}`);
}
console.log(`\nLive: ${counts.reviewed} reviewed, ${counts.auto} unchecked · Held: ${counts.held}${filter ? ` (filter: ${filter})` : ''}`);
