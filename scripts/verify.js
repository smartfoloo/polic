// Checks each unapproved draft against its source: code checks (scripts/lib/checks.js) plus the AI
// checker. Results go into the bill as "checks". When the check finds problems, the drafter rewrites
// the draft once from the notes and a fresh check runs; what that doesn't settle stays held.
// Usage: npm run verify [-- <bill id> …] [--no-fix]   Calls the AI only when a bill's draft or the
// prompt changed, or a flagged draft hasn't had its one fix yet; code checks are re-run on every
// bill (free), so fixing a check doesn't cost an AI call.

import { readFile } from 'node:fs/promises';
import { loadBills, saveBillFile } from './lib/bills-io.js';
import { checkDraft } from './lib/checks.js';
import { costReport } from './lib/llm.js';
import { checkBill, fixBill, STEPS } from './lib/pipeline.js';
import { VERIFY_PROMPT_VERSION } from './lib/prompts.js';
import { textPath } from './lib/store.js';

const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const noFix = process.argv.includes('--no-fix');
/** @type {import('./lib/llm.js').Usage[]} */
const usages = [];
/** @type {import('./lib/llm.js').Usage[]} */
const fixUsages = [];

const report = (/** @type {any} */ bill, /** @type {string} */ label) => {
	const { flags, issues } = bill.checks;
	const n = flags.length + issues.length;
	console.log(`${bill.id}: ${label}${n ? `${n} to look at` : 'clean'}`);
	for (const f of flags) console.log(`    code: ${f}`);
	for (const i of issues) console.log(`    ai [${i.severity}] ${i.field}/${i.kind}: 「${i.quote}」 → ${i.note}`);
};

/** One rewrite from the notes, then a fresh check. */
async function tryFix(/** @type {string} */ path, /** @type {any} */ bill, /** @type {string} */ source) {
	if (noFix) return;
	const u = await fixBill(bill, source);
	if (!u) return;
	fixUsages.push(u.fix);
	usages.push(u.check);
	await saveBillFile(path, bill);
	report(bill, 'fixed from the notes, rechecked: ');
}

for (const { path, bill } of await loadBills()) {
	if (!bill.draft || bill.approved || (only.length && !only.includes(bill.id))) continue;
	const c = bill.checks;
	const aiCurrent = c && c.draftAt === bill.draft.generatedAt && c.ai?.promptVersion === VERIFY_PROMPT_VERSION;

	const source = await readFile(textPath(bill.id), 'utf8').catch(() => '');
	if (!source.trim()) {
		if (!aiCurrent) console.log(`  ! ${bill.id}: no source text in cache/ — run npm run collect first`);
		continue;
	}

	try {
		if (aiCurrent) {
			const flags = checkDraft(bill, source);
			if (JSON.stringify(flags) !== JSON.stringify(c.flags)) {
				c.flags = flags;
				await saveBillFile(path, bill);
				console.log(`${bill.id}: code checks updated${flags.length ? '' : ', now clean'}`);
				for (const f of flags) console.log(`    code: ${f}`);
			}
		} else {
			usages.push(await checkBill(bill, source));
			await saveBillFile(path, bill);
			report(bill, '');
		}
		await tryFix(path, bill, source);
	} catch (err) {
		console.log(`  ! ${bill.id}: ${/** @type {Error} */ (err).message}`);
	}
}

if (fixUsages.length) console.log(`Fixes: ${costReport(fixUsages, STEPS.draft.model)}`);
console.log(usages.length ? `Checks: ${costReport(usages, STEPS.verify.model)}` : 'Nothing to verify.');
