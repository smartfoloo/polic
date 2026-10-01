import { error, fail } from '@sveltejs/kit';
import { categories } from '$lib/config/categories.js';
import { assertDev, findBill, loadApiKey, readSource, saveBillFile } from '$lib/server/admin.js';
import { publicAssemblies, toPublic } from '$lib/server/data.js';
import { checkDraft } from '../../../../scripts/lib/checks.js';
import { costUsd } from '../../../../scripts/lib/llm.js';
import { checkBill, draftBill, STEPS, translateBill } from '../../../../scripts/lib/pipeline.js';
import { jaSource } from '../../../../scripts/lib/prompts.js';
import { reviewStatus } from '../../../../scripts/lib/queues.js';

export const prerender = false;

// Rough token counts from past runs (PLAN.md): about 1,850 tokens of prompt plus 0.53 per source character.
const usage = (/** @type {number} */ input, /** @type {number} */ output) => ({ inputTokens: input, cachedTokens: 0, outputTokens: output, reasoningTokens: 0 });
const estimate = (/** @type {number} */ chars) => {
	const input = 1850 + 0.53 * chars;
	return {
		redraft: costUsd(usage(input, 1600), STEPS.draft.model) + costUsd(usage(input + 500, 300), STEPS.verify.model),
		translate: costUsd(usage(700, 1400), STEPS.translate.model)
	};
};

export const load = async ({ params }) => {
	assertDev();
	const { bill } = await findBill(params.id);
	const source = await readSource(bill.id);
	return {
		bill,
		source,
		status: reviewStatus(bill),
		enStale: !bill.en || bill.en.sourceHash !== jaSource(bill).hash,
		preview: toPublic(bill),
		assembly: publicAssemblies.find((a) => a.id === bill.assembly) ?? error(500, `Unknown assembly ${bill.assembly}`),
		estimate: estimate(source.length)
	};
};

const text = (/** @type {unknown} */ v) => String(v ?? '').trim();
const list = (/** @type {unknown} */ v) => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);

/** @param {FormData} form */
function fields(form) {
	try {
		return JSON.parse(String(form.get('json') ?? '{}'));
	} catch {
		error(400, 'Bad form data');
	}
}

/** Japanese edits, then the code checks again so the flags match the new text. */
async function applyJa(/** @type {any} */ bill, /** @type {any} */ f) {
	if (bill.titleOnly) return;
	if (!text(f.name) || !text(f.summary)) return fail(400, { message: 'Headline and summary can’t be empty.' });
	if (!categories.some((c) => c.ja === f.category)) return fail(400, { message: `Unknown category 「${f.category}」.` });
	Object.assign(bill, { name: text(f.name), category: f.category, summary: text(f.summary), changes: list(f.changes), who: list(f.who), why: text(f.why) });
	if (bill.checks) bill.checks.flags = checkDraft(bill, await readSource(bill.id));
}

function applyEn(/** @type {any} */ bill, /** @type {any} */ f) {
	if (!bill.en) return fail(400, { message: 'No English yet: retranslate first.' });
	if (bill.titleOnly) bill.en.official = text(f.official);
	else Object.assign(bill.en, { name: text(f.name), official: text(f.official), summary: text(f.summary), changes: list(f.changes), who: list(f.who), why: text(f.why) });
}

const usd = (/** @type {number} */ n) => `$${n.toFixed(3)}`;

/** @type {import('./$types').Actions} */
export const actions = {
	save: async ({ params, request }) => {
		assertDev();
		const { path, bill } = await findBill(params.id);
		const bad = await applyJa(bill, fields(await request.formData()));
		if (bad) return bad;
		await saveBillFile(path, bill);
		return { message: 'Saved.' };
	},

	approve: async ({ params, request }) => {
		assertDev();
		const { path, bill } = await findBill(params.id);
		const bad = await applyJa(bill, fields(await request.formData()));
		if (bad) return bad;
		bill.approved = true;
		await saveBillFile(path, bill);
		return { message: 'Approved.' };
	},

	saveEn: async ({ params, request }) => {
		assertDev();
		const { path, bill } = await findBill(params.id);
		const bad = applyEn(bill, fields(await request.formData()));
		if (bad) return bad;
		await saveBillFile(path, bill);
		return { message: 'English saved.' };
	},

	approveEn: async ({ params, request }) => {
		assertDev();
		const { path, bill } = await findBill(params.id);
		const bad = applyEn(bill, fields(await request.formData()));
		if (bad) return bad;
		bill.en.approved = true;
		await saveBillFile(path, bill);
		return { message: 'English approved.' };
	},

	/** Puts a dismissed flag back, so it holds the bill again. */
	undismiss: async ({ params, request }) => {
		assertDev();
		const { path, bill } = await findBill(params.id);
		const ref = JSON.parse(String((await request.formData()).get('ref') ?? '{}'));
		if (typeof ref.flag === 'string') bill.checks.dismissedFlags = (bill.checks.dismissedFlags ?? []).filter((/** @type {any} */ d) => d.flag !== ref.flag);
		else if (Number.isInteger(ref.issue) && bill.checks.issues[ref.issue]) delete bill.checks.issues[ref.issue].dismissed;
		else return fail(400, { message: 'Unknown flag.' });
		if (!bill.checks.dismissedFlags?.length) delete bill.checks.dismissedFlags;
		await saveBillFile(path, bill);
		return { message: 'Flag restored.' };
	},

	factsOk: async ({ params }) => {
		assertDev();
		const { path, bill } = await findBill(params.id);
		delete bill.factsUpdated;
		await saveBillFile(path, bill);
		return { message: 'Marked as rechecked.' };
	},

	redraft: async ({ params }) => {
		assertDev();
		loadApiKey();
		const { path, bill } = await findBill(params.id);
		const source = await readSource(bill.id);
		if (!source.trim()) return fail(400, { message: 'No source text in cache/: run npm run collect first.' });
		try {
			const d = await draftBill(bill, source);
			const c = await checkBill(bill, source);
			await saveBillFile(path, bill);
			const n = bill.checks.flags.length + bill.checks.issues.length;
			return { message: `Re-drafted and checked: ${n ? `${n} to look at` : 'clean'} · ${usd(costUsd(d, STEPS.draft.model) + costUsd(c, STEPS.verify.model))}` };
		} catch (err) {
			return fail(502, { message: `AI call failed: ${/** @type {Error} */ (err).message}` });
		}
	},

	retranslate: async ({ params }) => {
		assertDev();
		loadApiKey();
		const { path, bill } = await findBill(params.id);
		if (reviewStatus(bill).state === 'held') return fail(400, { message: 'Held bills aren’t translated: approve the Japanese first.' });
		try {
			const u = await translateBill(bill);
			await saveBillFile(path, bill);
			return { message: `Translated · ${usd(costUsd(u, STEPS.translate.model))}` };
		} catch (err) {
			return fail(502, { message: `AI call failed: ${/** @type {Error} */ (err).message}` });
		}
	}
};
