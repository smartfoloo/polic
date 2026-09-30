// Drafts the plain-language Japanese fields for bills that don't have a draft yet.
// Usage: npm run draft [-- <bill id> …]   To redraft a bill, delete its "draft" key.

import { readFile } from 'node:fs/promises';
import { assemblies } from '../src/lib/config/assemblies.js';
import { loadBills, saveBillFile } from './lib/bills-io.js';
import { callJson, costReport, MODELS } from './lib/llm.js';
import { DRAFT_INSTRUCTIONS, DRAFT_PROMPT_VERSION, DRAFT_SCHEMA, draftInput } from './lib/prompts.js';
import { textPath } from './lib/store.js';

const MODEL = MODELS.draft;
const EFFORT = 'high';
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

	const assemblyName = assemblies.find((a) => a.id === bill.assembly)?.name ?? bill.assembly;
	try {
		const { data, usage } = await callJson({
			model: MODEL,
			effort: EFFORT,
			instructions: DRAFT_INSTRUCTIONS,
			input: draftInput(bill, assemblyName, source),
			name: 'bill_draft',
			schema: DRAFT_SCHEMA
		});
		usages.push(usage);
		Object.assign(bill, data, {
			approved: false,
			draft: { model: MODEL, effort: EFFORT, promptVersion: DRAFT_PROMPT_VERSION, generatedAt: new Date().toISOString(), ...usage }
		});
		await saveBillFile(path, bill);
		console.log(`${bill.id}: ${data.name}`);
	} catch (err) {
		console.log(`  ! ${bill.id}: ${/** @type {Error} */ (err).message}`);
	}
}

console.log(usages.length ? costReport(usages, MODEL) : 'Nothing to draft.');
