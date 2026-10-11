// The one place that talks to the LLM. Models and prices live here so switching is a one-line change.

import OpenAI, { toFile } from 'openai';

// Luna writes (cheap; the check catches its mistakes), Sol checks. Decided 2026-09-30.
export const MODELS = /** @type {const} */ ({ draft: 'gpt-6-luna', translate: 'gpt-6-luna', verify: 'gpt-6.1-sol' });

/** USD per 1M tokens, checked 2026-09-30. Luna's cached rate wasn't checked, so it's counted at the full rate. */
const PRICE_PER_M = {
	'gpt-6-luna': { input: 0.1, cachedInput: 0.1, output: 0.5 },
	'gpt-6.1-sol': { input: 2, cachedInput: 0.1, output: 10 }
};

/** Batch API calls cost half the price, both models. */
const BATCH_RATE = 0.5;

/** @type {OpenAI | undefined} */
let client;

/**
 * @typedef {object} Usage
 * @property {number} inputTokens
 * @property {number} cachedTokens included in inputTokens, billed at the cached rate
 * @property {number} outputTokens
 * @property {number} reasoningTokens included in outputTokens
 * @property {true} [batch] made through the Batch API, billed at BATCH_RATE
 */

/**
 * @typedef {object} Request
 * @property {keyof typeof PRICE_PER_M} model
 * @property {'low' | 'medium' | 'high'} effort
 * @property {string} instructions
 * @property {string} input
 * @property {string} name
 * @property {Record<string, unknown>} schema
 */

/** The Responses API body, the same for a direct call and a batch line. */
const body = (/** @type {Request} */ { model, effort, instructions, input, name, schema }) => ({
	model,
	reasoning: { effort },
	instructions,
	input,
	store: false,
	text: { format: { type: /** @type {const} */ ('json_schema'), name, schema, strict: true } }
});

/**
 * A finished response's JSON and usage. Batch output is raw JSON, without the SDK's output_text.
 * @param {any} res
 * @param {boolean} batch
 * @returns {{ data: any, usage: Usage }}
 */
function parse(res, batch) {
	if (res.status !== 'completed') throw new Error(`Response ${res.status}: ${JSON.stringify(res.incomplete_details)}`);
	const text =
		res.output_text ??
		res.output
			.filter((/** @type {any} */ o) => o.type === 'message')
			.flatMap((/** @type {any} */ o) => o.content)
			.filter((/** @type {any} */ c) => c.type === 'output_text')
			.map((/** @type {any} */ c) => c.text)
			.join('');
	return {
		data: JSON.parse(text),
		usage: {
			inputTokens: res.usage?.input_tokens ?? 0,
			cachedTokens: res.usage?.input_tokens_details?.cached_tokens ?? 0,
			outputTokens: res.usage?.output_tokens ?? 0,
			reasoningTokens: res.usage?.output_tokens_details?.reasoning_tokens ?? 0,
			...(batch ? { batch: /** @type {const} */ (true) } : {})
		}
	};
}

/**
 * Structured-output call: the model must return JSON matching `schema` exactly.
 * `store: false` so OpenAI keeps no response state beyond its abuse-monitoring logs.
 * @param {Request} req
 * @returns {Promise<{ data: any, usage: Usage }>}
 */
export async function callJson(req) {
	client ??= new OpenAI();
	return parse(await client.responses.create(body(req)), false);
}

/**
 * Uploads the requests as one Batch API job (24-hour window). custom_id comes back with each result.
 * @param {{ customId: string, req: Request }[]} lines
 * @param {Record<string, string>} metadata
 */
export async function submitBatch(lines, metadata) {
	client ??= new OpenAI();
	const jsonl = lines.map((l) => JSON.stringify({ custom_id: l.customId, method: 'POST', url: '/v1/responses', body: body(l.req) })).join('\n');
	const file = await client.files.create({ file: await toFile(Buffer.from(jsonl + '\n'), 'requests.jsonl'), purpose: 'batch' });
	return client.batches.create({ input_file_id: file.id, endpoint: '/v1/responses', completion_window: '24h', metadata });
}

/** @param {string} id */
export async function getBatch(id) {
	client ??= new OpenAI();
	return client.batches.retrieve(id);
}

/**
 * Results of a batch that has stopped (completed, expired or cancelled keep what finished): custom_id → result or error.
 * @param {import('openai').OpenAI.Batch} batch
 * @returns {Promise<Map<string, { data: any, usage: Usage } | { error: string }>>}
 */
export async function batchResults(batch) {
	client ??= new OpenAI();
	/** @type {Map<string, { data: any, usage: Usage } | { error: string }>} */
	const out = new Map();
	for (const fileId of [batch.output_file_id, batch.error_file_id]) {
		if (!fileId) continue;
		const text = await (await client.files.content(fileId)).text();
		for (const line of text.split('\n').filter((l) => l.trim())) {
			const r = JSON.parse(line);
			try {
				if (r.error) throw new Error(r.error.message ?? r.error.code);
				if (r.response?.status_code !== 200) throw new Error(`HTTP ${r.response?.status_code}: ${r.response?.body?.error?.message ?? ''}`);
				out.set(r.custom_id, parse(r.response.body, true));
			} catch (err) {
				out.set(r.custom_id, { error: /** @type {Error} */ (err).message });
			}
		}
	}
	return out;
}

/**
 * @param {Usage[]} usages
 * @param {keyof typeof PRICE_PER_M} model
 */
export function costReport(usages, model) {
	const sum = (/** @type {'inputTokens' | 'cachedTokens' | 'outputTokens' | 'reasoningTokens'} */ k) => usages.reduce((a, u) => a + u[k], 0);
	const [i, c, o, r] = [sum('inputTokens'), sum('cachedTokens'), sum('outputTokens'), sum('reasoningTokens')];
	const usd = usages.reduce((a, u) => a + costUsd(u, model), 0);
	return `${usages.length} calls · ${i} input (${c} cached) / ${o} output tokens (${r} reasoning) · ~$${usd.toFixed(3)}`;
}

/**
 * @param {Usage} u
 * @param {keyof typeof PRICE_PER_M} model
 */
export function costUsd(u, model) {
	const price = PRICE_PER_M[model];
	const full = ((u.inputTokens - u.cachedTokens) * price.input + u.cachedTokens * price.cachedInput + u.outputTokens * price.output) / 1e6;
	return u.batch ? full * BATCH_RATE : full;
}
