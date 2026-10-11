// The AI steps through the OpenAI Batch API, at half price. Each run picks up finished batches and
// writes their results into the bills, then submits each bill's next step: draft → check → one fix
// from the notes when the check holds it → check again → English once the bill can go live. Run it
// again later to carry on, or pass --wait to keep going (checking every minute) until nothing is left.
// Usage: npm run batch [-- <bill id | assembly id> …] [--wait]
// Assemblies marked excluded are skipped. Submitted batches are tracked in cache/batches/state.json.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { APIConnectionError } from 'openai';
import { assemblies } from '../src/lib/config/assemblies.js';
import { loadBills, saveBillFile } from './lib/bills-io.js';
import { batchResults, costReport, getBatch, submitBatch } from './lib/llm.js';
import {
	applyCheck,
	applyDraft,
	applyFix,
	applyTranslate,
	checkCurrent,
	checkRequest,
	draftRequest,
	fixableNotes,
	fixRequest,
	needsFix,
	translateRequest
} from './lib/pipeline.js';
import { jaSource } from './lib/prompts.js';
import { publishState } from './lib/publish.js';
import { textPath } from './lib/store.js';

const STATE = 'cache/batches/state.json';
const POLL_MS = 60_000;
/** A request that fails this many times is left for a direct run (npm run draft / verify / translate). */
const MAX_FAILURES = 2;
const STEP_ORDER = /** @type {const} */ (['draft', 'check', 'fix', 'translate']);

/** @typedef {typeof STEP_ORDER[number]} Step */
/**
 * @typedef {object} Pending one request in a submitted batch
 * @property {string} bill
 * @property {string} basis the bill's state the request was built from; a result for a bill changed since is dropped
 * @property {string[]} [notes] the checker notes a fix was asked to address
 */
/**
 * @typedef {object} State
 * @property {{ id: string, step: Step, model: string, submittedAt: string, requests: Record<string, Pending> }[]} batches
 * @property {Record<string, number>} caps most requests to keep queued per model, learned from token_limit_exceeded
 * @property {Record<string, number>} failures `step:bill id` → failed attempts
 */

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const wait = process.argv.includes('--wait');
const excluded = new Set(assemblies.filter((a) => a.excluded).map((a) => a.id));
const picked = (/** @type {any} */ bill) =>
	!excluded.has(bill.assembly) && (!args.length || args.includes(bill.id) || args.includes(bill.assembly));

const wantsEnglish = (/** @type {any} */ bill) => publishState(bill) !== 'held' && bill.en?.sourceHash !== jaSource(bill).hash;

/** @returns {Step | null} */
function nextStep(/** @type {any} */ bill) {
	if (bill.titleOnly) return wantsEnglish(bill) ? 'translate' : null;
	if (!bill.draft) return 'draft';
	if (!bill.approved && !checkCurrent(bill)) return 'check';
	if (needsFix(bill)) return 'fix';
	return wantsEnglish(bill) ? 'translate' : null;
}

/** What a step's result depends on; it's compared again when the result comes back. */
function basisOf(/** @type {Step} */ step, /** @type {any} */ bill) {
	if (step === 'translate') return jaSource(bill).hash;
	if (step === 'fix') return `${bill.draft?.generatedAt}|${bill.checks?.checkedAt}`;
	return bill.draft?.generatedAt ?? '';
}

const readSource = (/** @type {string} */ id) => readFile(textPath(id), 'utf8').catch(() => '');

/** @returns {Promise<State>} */
async function loadState() {
	try {
		return JSON.parse(await readFile(STATE, 'utf8'));
	} catch {
		return { batches: [], caps: {}, failures: {} };
	}
}

async function saveState(/** @type {State} */ state) {
	await mkdir('cache/batches', { recursive: true });
	await writeFile(STATE, JSON.stringify(state, null, '\t') + '\n');
}

/**
 * Writes one result into its bill.
 * @param {Step} step
 * @param {any} bill
 * @param {{ data: any, usage: import('./lib/llm.js').Usage }} result
 * @param {Pending} pending
 */
async function apply(step, bill, { data, usage }, pending) {
	if (step === 'draft') {
		applyDraft(bill, data, usage);
		return bill.name;
	}
	if (step === 'check') {
		applyCheck(bill, data, usage, await readSource(bill.id));
		const n = bill.checks.flags.length + bill.checks.issues.length;
		return n ? `${n} to look at` : 'clean';
	}
	if (step === 'fix') {
		applyFix(bill, data, usage, pending.notes ?? []);
		return 'fixed from the notes, check next';
	}
	applyTranslate(bill, data, usage);
	return bill.en.name ?? bill.en.official;
}

/** Writes the results of batches that have stopped. */
async function collect(/** @type {State} */ state) {
	const bills = new Map((await loadBills()).map((x) => [x.bill.id, x]));
	/** @type {string[]} */
	const running = [];
	for (const b of [...state.batches]) {
		const batch = await getBatch(b.id);
		const n = Object.keys(b.requests).length;
		if (['validating', 'in_progress', 'finalizing', 'cancelling'].includes(batch.status)) {
			const c = batch.request_counts;
			running.push(`${b.step} (${b.id}): ${batch.status}${c ? `, ${c.completed}/${n} done` : ''}`);
			continue;
		}

		if (batch.status === 'failed') {
			const errors = batch.errors?.data ?? [];
			// Over the queued-token cap for the model: its bills go back in the pool, submitted in smaller pieces.
			if (errors.some((e) => e.code === 'token_limit_exceeded')) {
				const cap = Math.max(1, Math.floor(n / 2));
				state.caps[b.model] = Math.min(state.caps[b.model] ?? cap, cap);
				console.log(`${b.step} (${b.id}): over the queued-token limit for ${b.model}, resubmitting at most ${state.caps[b.model]} at a time`);
			} else {
				console.log(`  ! ${b.step} (${b.id}) failed: ${errors.map((e) => e.message ?? e.code).join('; ') || 'no reason given'}`);
			}
		} else {
			const results = await batchResults(batch);
			/** @type {import('./lib/llm.js').Usage[]} */
			const usages = [];
			let missing = 0;
			for (const [customId, pending] of Object.entries(b.requests)) {
				const r = results.get(customId);
				const entry = bills.get(pending.bill);
				if (!r) {
					missing++;
					continue;
				}
				if ('error' in r) {
					state.failures[customId] = (state.failures[customId] ?? 0) + 1;
					console.log(`  ! ${pending.bill}: ${b.step} failed: ${r.error}`);
					continue;
				}
				if (!entry) {
					console.log(`  ! ${pending.bill}: bill file is gone, ${b.step} result dropped`);
					continue;
				}
				if (basisOf(b.step, entry.bill) !== pending.basis) {
					console.log(`  ! ${pending.bill}: changed since the ${b.step} was submitted, result dropped`);
					continue;
				}
				const label = await apply(b.step, entry.bill, r, pending);
				await saveBillFile(entry.path, entry.bill);
				delete state.failures[customId];
				usages.push(r.usage);
				console.log(`${pending.bill} (${b.step}): ${label}`);
			}
			if (usages.length) console.log(`${b.step}: ${costReport(usages, /** @type {any} */ (b.model))}`);
			if (missing) console.log(`  ! ${b.step} (${b.id}) ${batch.status} with ${missing} requests unanswered; they go out again`);
		}
		state.batches = state.batches.filter((x) => x.id !== b.id);
		await saveState(state);
	}
	return running;
}

/** Submits each picked bill's next step, one batch per step. Returns how many requests went out. */
async function submit(/** @type {State} */ state) {
	const inFlight = new Set(state.batches.flatMap((b) => Object.values(b.requests).map((p) => p.bill)));
	/** @type {Record<Step, { customId: string, req: import('./lib/llm.js').Request, pending: Pending }[]>} */
	const todo = { draft: [], check: [], fix: [], translate: [] };
	let gaveUp = 0;

	for (const { bill } of await loadBills()) {
		if (inFlight.has(bill.id) || !picked(bill)) continue;
		const step = nextStep(bill);
		if (!step) continue;
		const customId = `${step}:${bill.id}`;
		if ((state.failures[customId] ?? 0) >= MAX_FAILURES) {
			gaveUp++;
			continue;
		}
		const source = step === 'translate' ? '' : await readSource(bill.id);
		if (step !== 'translate' && !source.trim()) {
			console.log(`  ! ${bill.id}: no source text in cache/ — run npm run collect first`);
			continue;
		}
		const notes = step === 'fix' ? fixableNotes(bill) : undefined;
		const req =
			step === 'draft'
				? draftRequest(bill, source)
				: step === 'check'
					? checkRequest(bill, source)
					: step === 'fix'
						? fixRequest(bill, notes ?? [], source)
						: translateRequest(bill);
		todo[step].push({ customId, req, pending: { bill: bill.id, basis: basisOf(step, bill), ...(notes ? { notes } : {}) } });
	}

	let sent = 0;
	for (const step of STEP_ORDER) {
		const all = todo[step];
		if (!all.length) continue;
		const model = all[0].req.model;
		const cap = state.caps[model];
		const queued = state.batches.filter((b) => b.model === model).reduce((a, b) => a + Object.keys(b.requests).length, 0);
		const lines = cap ? all.slice(0, Math.max(0, cap - queued)) : all;
		const later = all.length - lines.length;
		if (lines.length) {
			const batch = await submitBatch(lines, { step });
			state.batches.push({
				id: batch.id,
				step,
				model,
				submittedAt: new Date().toISOString(),
				requests: Object.fromEntries(lines.map((l) => [l.customId, l.pending]))
			});
			await saveState(state);
			sent += lines.length;
		}
		console.log(`Submitted ${step}: ${lines.length} bills${later ? `, ${later} more once the queue has room` : ''}`);
	}
	if (gaveUp) console.log(`  ! ${gaveUp} requests failed ${MAX_FAILURES} times and are left out; run them directly`);
	return sent;
}

const state = await loadState();
let last = '';
for (;;) {
	/** @type {string[]} */
	let running;
	try {
		running = await collect(state);
		await submit(state);
	} catch (err) {
		// A network blip shouldn't end a wait that can last hours; the batches carry on at OpenAI.
		if (!wait || !(err instanceof APIConnectionError)) throw err;
		console.log(`  ! ${new Date().toLocaleTimeString()}: connection error, trying again in a minute`);
		await sleep(POLL_MS);
		continue;
	}
	if (!state.batches.length) {
		console.log('Nothing left to do.');
		break;
	}
	const status = running.length ? `Waiting on:\n  ${running.join('\n  ')}` : '';
	if (!wait) {
		if (status) console.log(status);
		console.log('Run npm run batch again later to collect the results (or --wait to stay until done).');
		break;
	}
	// Only print when something changed, so a long wait stays quiet.
	if (status && status !== last) console.log(status);
	last = status;
	await sleep(POLL_MS);
}
