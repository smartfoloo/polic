// One bill through each AI step. Used by `npm run draft`, `verify` and `translate`, and by the
// admin page's re-draft and retranslate buttons, so both paths write the same fields.

import { assemblies } from '../../src/lib/config/assemblies.js';
import { checkDraft } from './checks.js';
import { holdReasons } from './publish.js';
import { callJson, MODELS } from './llm.js';
import {
	DRAFT_INSTRUCTIONS,
	DRAFT_PROMPT_VERSION,
	DRAFT_SCHEMA,
	draftInput,
	FIX_INSTRUCTIONS,
	FIX_PROMPT_VERSION,
	fixInput,
	jaSource,
	TRANSLATE_INSTRUCTIONS,
	TRANSLATE_PROMPT_VERSION,
	TRANSLATE_SCHEMA,
	TRANSLATE_TITLE_SCHEMA,
	VERIFY_INSTRUCTIONS,
	VERIFY_PROMPT_VERSION,
	VERIFY_SCHEMA,
	verifyInput
} from './prompts.js';

export const STEPS = /** @type {const} */ ({
	draft: { model: MODELS.draft, effort: 'high' },
	verify: { model: MODELS.verify, effort: 'medium' },
	translate: { model: MODELS.translate, effort: 'high' }
});

/**
 * Writes the Japanese fields and resets approval. Replaces any existing draft.
 * @param {any} bill
 * @param {string} source
 */
export async function draftBill(bill, source) {
	const { model, effort } = STEPS.draft;
	const assembly = assemblies.find((a) => a.id === bill.assembly);
	const { data, usage } = await callJson({
		model,
		effort,
		instructions: DRAFT_INSTRUCTIONS,
		input: draftInput(bill, assembly?.name ?? bill.assembly, source, assembly?.head),
		name: 'bill_draft',
		schema: DRAFT_SCHEMA
	});
	Object.assign(bill, data, {
		approved: false,
		draft: { model, effort, promptVersion: DRAFT_PROMPT_VERSION, generatedAt: new Date().toISOString(), ...usage }
	});
	return usage;
}

/**
 * Code checks plus the AI checker, stored as bill.checks. Never edits the draft.
 * @param {any} bill
 * @param {string} source
 */
export async function checkBill(bill, source) {
	const { model, effort } = STEPS.verify;
	const flags = checkDraft(bill, source);
	const { data, usage } = await callJson({
		model,
		effort,
		instructions: VERIFY_INSTRUCTIONS,
		input: verifyInput(bill, source),
		name: 'bill_check',
		schema: VERIFY_SCHEMA
	});
	bill.checks = {
		draftAt: bill.draft.generatedAt,
		checkedAt: new Date().toISOString(),
		flags,
		issues: data.issues,
		ai: { model, effort, promptVersion: VERIFY_PROMPT_VERSION, ...usage },
		// Dismissals match the exact flag text, so they only carry over while the flag is unchanged.
		...(bill.checks?.dismissedFlags ? { dismissedFlags: bill.checks.dismissedFlags } : {})
	};
	return usage;
}

/**
 * What a rewrite could fix: open checker notes (not omissions) and code flags, minus a garbled
 * source table, which no rewrite changes.
 * @param {any} bill
 */
export function fixableNotes(bill) {
	const reasons = holdReasons(bill);
	return reasons.filter((r) => r.startsWith('ai ') || (r.startsWith('code: ') && !r.startsWith('code: source has a garbled')));
}

/**
 * The drafter rewrites the draft once from the checker's notes, then a fresh check runs. Only once
 * per draft (draft.fixed), so a bill the fix doesn't settle stays held for a person.
 * @param {any} bill
 * @param {string} source
 * @returns {Promise<{ fix: import('./llm.js').Usage, check: import('./llm.js').Usage } | null>}
 */
export async function fixBill(bill, source) {
	const notes = fixableNotes(bill);
	if (!notes.length || bill.draft.fixed || bill.approved) return null;
	const { model, effort } = STEPS.draft;
	const { data, usage } = await callJson({
		model,
		effort,
		instructions: FIX_INSTRUCTIONS,
		input: fixInput(bill, notes, source),
		name: 'bill_draft',
		schema: DRAFT_SCHEMA
	});
	const at = new Date().toISOString();
	Object.assign(bill, data);
	bill.draft = { ...bill.draft, generatedAt: at, fixed: { model, effort, promptVersion: FIX_PROMPT_VERSION, at, notes, ...usage } };
	return { fix: usage, check: await checkBill(bill, source) };
}

/**
 * English from our Japanese (never from the source), stored as bill.en with approved: false.
 * @param {any} bill
 */
export async function translateBill(bill) {
	const { model, effort } = STEPS.translate;
	const { ja, hash: sourceHash } = jaSource(bill);
	const { data, usage } = await callJson({
		model,
		effort,
		instructions: TRANSLATE_INSTRUCTIONS,
		input: JSON.stringify(ja, null, 2),
		name: bill.titleOnly ? 'bill_title_translation' : 'bill_translation',
		schema: bill.titleOnly ? TRANSLATE_TITLE_SCHEMA : TRANSLATE_SCHEMA
	});
	bill.en = {
		approved: false,
		sourceHash,
		...data,
		draft: { model, effort, promptVersion: TRANSLATE_PROMPT_VERSION, generatedAt: new Date().toISOString(), ...usage }
	};
	return usage;
}
