// The one place that talks to the LLM. Models and prices live here so switching is a one-line change.

import OpenAI from 'openai';

// Luna writes (cheap; the check catches its mistakes), Sol checks. Decided 2026-09-30.
export const MODELS = /** @type {const} */ ({ draft: 'gpt-6-luna', translate: 'gpt-6-luna', verify: 'gpt-6.1-sol' });

/** USD per 1M tokens, checked 2026-09-30. Luna's cached rate wasn't checked, so it's counted at the full rate. */
const PRICE_PER_M = {
	'gpt-6-luna': { input: 0.1, cachedInput: 0.1, output: 0.5 },
	'gpt-6.1-sol': { input: 2, cachedInput: 0.1, output: 10 }
};

/** @type {OpenAI | undefined} */
let client;

/**
 * @typedef {object} Usage
 * @property {number} inputTokens
 * @property {number} cachedTokens included in inputTokens, billed at the cached rate
 * @property {number} outputTokens
 * @property {number} reasoningTokens included in outputTokens
 */

/**
 * Structured-output call: the model must return JSON matching `schema` exactly.
 * `store: false` so OpenAI keeps no response state beyond its abuse-monitoring logs.
 * @param {{ model: keyof typeof PRICE_PER_M, effort: 'low' | 'medium' | 'high', instructions: string, input: string, name: string, schema: Record<string, unknown> }} req
 * @returns {Promise<{ data: any, usage: Usage }>}
 */
export async function callJson({ model, effort, instructions, input, name, schema }) {
	client ??= new OpenAI();
	const res = await client.responses.create({
		model,
		reasoning: { effort },
		instructions,
		input,
		store: false,
		text: { format: { type: 'json_schema', name, schema, strict: true } }
	});
	if (res.status !== 'completed') throw new Error(`Response ${res.status}: ${JSON.stringify(res.incomplete_details)}`);
	return {
		data: JSON.parse(res.output_text),
		usage: {
			inputTokens: res.usage?.input_tokens ?? 0,
			cachedTokens: res.usage?.input_tokens_details?.cached_tokens ?? 0,
			outputTokens: res.usage?.output_tokens ?? 0,
			reasoningTokens: res.usage?.output_tokens_details?.reasoning_tokens ?? 0
		}
	};
}

/**
 * @param {Usage[]} usages
 * @param {keyof typeof PRICE_PER_M} model
 */
export function costReport(usages, model) {
	const sum = (/** @type {keyof Usage} */ k) => usages.reduce((a, u) => a + u[k], 0);
	const [i, c, o, r] = [sum('inputTokens'), sum('cachedTokens'), sum('outputTokens'), sum('reasoningTokens')];
	const usd = costUsd({ inputTokens: i, cachedTokens: c, outputTokens: o, reasoningTokens: r }, model);
	return `${usages.length} calls · ${i} input (${c} cached) / ${o} output tokens (${r} reasoning) · ~$${usd.toFixed(3)}`;
}

/**
 * @param {Usage} u
 * @param {keyof typeof PRICE_PER_M} model
 */
export function costUsd(u, model) {
	const price = PRICE_PER_M[model];
	return ((u.inputTokens - u.cachedTokens) * price.input + u.cachedTokens * price.cachedInput + u.outputTokens * price.output) / 1e6;
}
