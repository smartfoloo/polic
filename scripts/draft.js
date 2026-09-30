// Drafts the plain-language Japanese fields for bills that don't have a draft yet.
// Usage: npm run draft [-- <bill id> …]   To redraft a bill, delete its "draft" key.

import { readFile } from 'node:fs/promises';
import { loadBills, saveBillFile } from './lib/bills-io.js';
import { costReport } from './lib/llm.js';
import { draftBill, STEPS } from './lib/pipeline.js';
import { textPath } from './lib/store.js';

const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
/** @type {import('./lib/llm.js').Usage[]} */
const usages = [];

for (const { path, bill } of await loadBills()) {
	if (bill.titleOnly || bill.draft || (only.length && !only.includes(bill.id))) continue;

	const source = await readFile(textPath(bill.id), 'utf8').catch(() => '');
	if (!source.trim()) {
		console.log(`  ! ${bill.id}: no source text in cache/ — run npm run collect first`);
		continue;
	}

	try {
		usages.push(await draftBill(bill, source));
		await saveBillFile(path, bill);
		console.log(`${bill.id}: ${bill.name}`);
	} catch (err) {
		console.log(`  ! ${bill.id}: ${/** @type {Error} */ (err).message}`);
	}
}

console.log(usages.length ? costReport(usages, STEPS.draft.model) : 'Nothing to draft.');
