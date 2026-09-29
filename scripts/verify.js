// Checks each unapproved draft against its source: code checks (scripts/lib/checks.js) plus the AI
// checker. Results go into the bill as "checks"; they flag bills for review and never edit drafts.
// Usage: npm run verify [-- <bill id> …]   Calls the AI only when a bill's draft or the prompt changed;
// code checks are re-run on every bill (free), so fixing a check doesn't cost an AI call.

import { readFile } from 'node:fs/promises';
import { loadBills, saveBillFile } from './lib/bills-io.js';
import { checkDraft } from './lib/checks.js';
import { callJson, costReport, MODEL } from './lib/llm.js';
import { VERIFY_INSTRUCTIONS, VERIFY_PROMPT_VERSION, VERIFY_SCHEMA, verifyInput } from './lib/prompts.js';
import { textPath } from './lib/store.js';

const EFFORT = 'medium';
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
/** @type {import('./lib/llm.js').Usage[]} */
const usages = [];

for (const { path, bill } of await loadBills()) {
	if (!bill.draft || bill.approved || (only.length && !only.includes(bill.id))) continue;
	const c = bill.checks;
	const aiCurrent = c && c.draftAt === bill.draft.generatedAt && c.ai?.promptVersion === VERIFY_PROMPT_VERSION;

	const source = await readFile(textPath(bill.id), 'utf8').catch(() => '');
	if (!source.trim()) {
		if (!aiCurrent) console.log(`  ! ${bill.id}: no source text in cache/ — run npm run collect first`);
		continue;
	}

	if (aiCurrent) {
		const flags = checkDraft(bill, source);
		if (JSON.stringify(flags) === JSON.stringify(c.flags)) continue;
		c.flags = flags;
		await saveBillFile(path, bill);
		console.log(`${bill.id}: code checks updated${flags.length ? '' : ', now clean'}`);
		for (const f of flags) console.log(`    code: ${f}`);
		continue;
	}

	try {
		const flags = checkDraft(bill, source);
		const { data, usage } = await callJson({
			effort: EFFORT,
			instructions: VERIFY_INSTRUCTIONS,
			input: verifyInput(bill, source),
			name: 'bill_check',
			schema: VERIFY_SCHEMA
		});
		usages.push(usage);
		bill.checks = {
			draftAt: bill.draft.generatedAt,
			checkedAt: new Date().toISOString(),
			flags,
			issues: data.issues,
			ai: { model: MODEL, effort: EFFORT, promptVersion: VERIFY_PROMPT_VERSION, ...usage }
		};
		await saveBillFile(path, bill);

		const n = flags.length + data.issues.length;
		console.log(`${bill.id}: ${n ? `${n} to look at` : 'clean'}`);
		for (const f of flags) console.log(`    code: ${f}`);
		for (const i of data.issues) console.log(`    ai [${i.severity}] ${i.field}/${i.kind}: 「${i.quote}」 → ${i.note}`);
	} catch (err) {
		console.log(`  ! ${bill.id}: ${/** @type {Error} */ (err).message}`);
	}
}

console.log(usages.length ? costReport(usages) : 'Nothing to verify.');
