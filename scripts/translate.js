// Translates Japanese summaries into English for bills that are live (reviewed, or passed the
// checks), when the English is missing or stale (the Japanese changed since translation).
// Usage: npm run translate

import { loadBills, saveBillFile } from './lib/bills-io.js';
import { callJson, costReport, MODEL } from './lib/llm.js';
import { publishState } from './lib/publish.js';
import { jaSource, TRANSLATE_INSTRUCTIONS, TRANSLATE_PROMPT_VERSION, TRANSLATE_SCHEMA, TRANSLATE_TITLE_SCHEMA } from './lib/prompts.js';

const EFFORT = 'low';
/** @type {import('./lib/llm.js').Usage[]} */
const usages = [];

for (const { path, bill } of await loadBills()) {
	if (publishState(bill) === 'held') continue;

	const { ja, hash: sourceHash } = jaSource(bill);
	if (bill.en?.sourceHash === sourceHash) continue;

	try {
		const { data, usage } = await callJson({
			effort: EFFORT,
			instructions: TRANSLATE_INSTRUCTIONS,
			input: JSON.stringify(ja, null, 2),
			name: bill.titleOnly ? 'bill_title_translation' : 'bill_translation',
			schema: bill.titleOnly ? TRANSLATE_TITLE_SCHEMA : TRANSLATE_SCHEMA
		});
		usages.push(usage);
		bill.en = {
			approved: false,
			sourceHash,
			...data,
			draft: { model: MODEL, effort: EFFORT, promptVersion: TRANSLATE_PROMPT_VERSION, generatedAt: new Date().toISOString(), ...usage }
		};
		await saveBillFile(path, bill);
		console.log(`${bill.id}: ${data.name ?? data.official}`);
	} catch (err) {
		console.log(`  ! ${bill.id}: ${/** @type {Error} */ (err).message}`);
	}
}

console.log(usages.length ? costReport(usages) : 'Nothing to translate.');
