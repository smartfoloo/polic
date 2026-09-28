// The one place that talks to the LLM. Model and prices live here so switching is a one-line change.

import OpenAI from 'openai';

export const MODEL = 'gpt-6-sol';
const PRICE_PER_M = { input: 2, output: 10 }; // USD, checked 2026-09-28

/** @type {OpenAI | undefined} */
let client;

/**
 * @typedef {object} Usage
 * @property {number} inputTokens
 * @property {number} outputTokens
 * @property {number} reasoningTokens included in outputTokens
 */

/**
 * Structured-output call: the model must return JSON matching `schema` exactly.
 * `store: false` so OpenAI keeps no response state beyond its abuse-monitoring logs.
 * @param {{ effort: 'low' | 'high', instructions: string, input: string, name: string, schema: Record<string, unknown> }} req
 * @returns {Promise<{ data: any, usage: Usage }>}
 */
export async function callJson({ effort, instructions, input, name, schema }) {
	client ??= new OpenAI();
	const res = await client.responses.create({
		model: MODEL,
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
			outputTokens: res.usage?.output_tokens ?? 0,
			reasoningTokens: res.usage?.output_tokens_details?.reasoning_tokens ?? 0
		}
	};
}

/** @param {Usage[]} usages */
export function costReport(usages) {
	const sum = (/** @type {keyof Usage} */ k) => usages.reduce((a, u) => a + u[k], 0);
	const [i, o, r] = [sum('inputTokens'), sum('outputTokens'), sum('reasoningTokens')];
	const usd = (i * PRICE_PER_M.input + o * PRICE_PER_M.output) / 1e6;
	return `${usages.length} calls · ${i} input / ${o} output tokens (${r} reasoning) · ~$${usd.toFixed(3)}`;
}
