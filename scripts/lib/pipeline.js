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

// Each step is a request builder and a writer, so a direct call and a Batch API result (scripts/batch.js)
// go through the same prompts and write the same fields.

/** @typedef {import('./llm.js').Usage} Usage */
/** @typedef {import('./llm.js').Request} Request */

/**
 * @param {any} bill
 * @param {string} source
 * @returns {Request}
 */
export function draftRequest(bill, source) {
	const assembly = assemblies.find((a) => a.id === bill.assembly);
	return {
		...STEPS.draft,
		instructions: DRAFT_INSTRUCTIONS,
		input: draftInput(bill, assembly?.name ?? bill.assembly, source, assembly?.head),
		name: 'bill_draft',
		schema: DRAFT_SCHEMA
	};
}

/**
 * Writes the Japanese fields and resets approval. Replaces any existing draft.
 * @param {any} bill
 * @param {any} data
 * @param {Usage} usage
 */
export function applyDraft(bill, data, usage) {
	const { model, effort } = STEPS.draft;
	Object.assign(bill, data, {
		approved: false,
		draft: { model, effort, promptVersion: DRAFT_PROMPT_VERSION, generatedAt: new Date().toISOString(), ...usage }
	});
}

/**
 * @param {any} bill
 * @param {string} source
 */
export async function draftBill(bill, source) {
	const { data, usage } = await callJson(draftRequest(bill, source));
	applyDraft(bill, data, usage);
	return usage;
}

/** Whether the bill's AI check is for its current draft and checker prompt. */
export const checkCurrent = (/** @type {any} */ bill) =>
	!!bill.checks && bill.checks.draftAt === bill.draft?.generatedAt && bill.checks.ai?.promptVersion === VERIFY_PROMPT_VERSION;

/**
 * @param {any} bill
 * @param {string} source
 * @returns {Request}
 */
export function checkRequest(bill, source) {
	return { ...STEPS.verify, instructions: VERIFY_INSTRUCTIONS, input: verifyInput(bill, source), name: 'bill_check', schema: VERIFY_SCHEMA };
}

/**
 * Code checks plus the AI checker's issues, stored as bill.checks. Never edits the draft.
 * @param {any} bill
 * @param {any} data
 * @param {Usage} usage
 * @param {string} source
 */
export function applyCheck(bill, data, usage, source) {
	const { model, effort } = STEPS.verify;
	bill.checks = {
		draftAt: bill.draft.generatedAt,
		checkedAt: new Date().toISOString(),
		flags: checkDraft(bill, source),
		issues: data.issues,
		ai: { model, effort, promptVersion: VERIFY_PROMPT_VERSION, ...usage },
		// Dismissals match the exact flag text, so they only carry over while the flag is unchanged.
		...(bill.checks?.dismissedFlags ? { dismissedFlags: bill.checks.dismissedFlags } : {})
	};
}

/**
 * @param {any} bill
 * @param {string} source
 */
export async function checkBill(bill, source) {
	const { data, usage } = await callJson(checkRequest(bill, source));
	applyCheck(bill, data, usage, source);
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

/** Whether the bill is due its one rewrite from the notes. */
export const needsFix = (/** @type {any} */ bill) => !bill.approved && !bill.draft?.fixed && fixableNotes(bill).length > 0;

/**
 * @param {any} bill
 * @param {string[]} notes
 * @param {string} source
 * @returns {Request}
 */
export function fixRequest(bill, notes, source) {
	return { ...STEPS.draft, instructions: FIX_INSTRUCTIONS, input: fixInput(bill, notes, source), name: 'bill_draft', schema: DRAFT_SCHEMA };
}

/**
 * The rewrite replaces the draft fields; draft.fixed records it, so it happens once per draft. Needs a fresh check after.
 * @param {any} bill
 * @param {any} data
 * @param {Usage} usage
 * @param {string[]} notes
 */
export function applyFix(bill, data, usage, notes) {
	const { model, effort } = STEPS.draft;
	const at = new Date().toISOString();
	Object.assign(bill, data);
	bill.draft = { ...bill.draft, generatedAt: at, fixed: { model, effort, promptVersion: FIX_PROMPT_VERSION, at, notes, ...usage } };
}

/**
 * The drafter rewrites the draft once from the checker's notes, then a fresh check runs. Only once
 * per draft (draft.fixed), so a bill the fix doesn't settle stays held for a person.
 * @param {any} bill
 * @param {string} source
 * @returns {Promise<{ fix: Usage, check: Usage } | null>}
 */
export async function fixBill(bill, source) {
	if (!needsFix(bill)) return null;
	const notes = fixableNotes(bill);
	const { data, usage } = await callJson(fixRequest(bill, notes, source));
	applyFix(bill, data, usage, notes);
	return { fix: usage, check: await checkBill(bill, source) };
}

/**
 * English from our Japanese (never from the source).
 * @param {any} bill
 * @returns {Request}
 */
export function translateRequest(bill) {
	return {
		...STEPS.translate,
		instructions: TRANSLATE_INSTRUCTIONS,
		input: JSON.stringify(jaSource(bill).ja, null, 2),
		name: bill.titleOnly ? 'bill_title_translation' : 'bill_translation',
		schema: bill.titleOnly ? TRANSLATE_TITLE_SCHEMA : TRANSLATE_SCHEMA
	};
}

/**
 * Stored as bill.en with approved: false, tied to the Japanese it came from by sourceHash.
 * @param {any} bill
 * @param {any} data
 * @param {Usage} usage
 */
export function applyTranslate(bill, data, usage) {
	const { model, effort } = STEPS.translate;
	bill.en = {
		approved: false,
		sourceHash: jaSource(bill).hash,
		...data,
		draft: { model, effort, promptVersion: TRANSLATE_PROMPT_VERSION, generatedAt: new Date().toISOString(), ...usage }
	};
}

/** @param {any} bill */
export async function translateBill(bill) {
	const { data, usage } = await callJson(translateRequest(bill));
	applyTranslate(bill, data, usage);
	return usage;
}
