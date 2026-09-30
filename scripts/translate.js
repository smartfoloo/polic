// Translates Japanese summaries into English for bills that are live (reviewed, or passed the
// checks), when the English is missing or stale (the Japanese changed since translation).
// Usage: npm run translate [-- <bill id> ...]

import { loadBills, saveBillFile } from './lib/bills-io.js';
import { costReport } from './lib/llm.js';
import { STEPS, translateBill } from './lib/pipeline.js';
import { jaSource } from './lib/prompts.js';
import { publishState } from './lib/publish.js';

const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
/** @type {import('./lib/llm.js').Usage[]} */
const usages = [];

for (const { path, bill } of await loadBills()) {
	if (publishState(bill) === 'held' || (only.length && !only.includes(bill.id))) continue;

	if (bill.en?.sourceHash === jaSource(bill).hash) continue;

	try {
		usages.push(await translateBill(bill));
		await saveBillFile(path, bill);
		console.log(`${bill.id}: ${bill.en.name ?? bill.en.official}`);
	} catch (err) {
		console.log(`  ! ${bill.id}: ${/** @type {Error} */ (err).message}`);
	}
}

console.log(usages.length ? costReport(usages, STEPS.translate.model) : 'Nothing to translate.');
