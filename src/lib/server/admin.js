// Server side of the review page (/admin). Dev only: it reads and writes data/ and cache/ on this
// machine, so every entry point calls assertDev() and the production server answers 404.

import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { loadBills, saveBillFile } from '../../../scripts/lib/bills-io.js';
import { textPath } from '../../../scripts/lib/store.js';

export function assertDev() {
	if (!dev) error(404);
}

/** @param {string} id */
export async function findBill(id) {
	const found = (await loadBills()).find((x) => x.bill.id === id);
	if (!found) error(404, `No bill ${id}`);
	return found;
}

/** @param {string} id */
export const readSource = (id) => readFile(textPath(id), 'utf8').catch(() => '');

export { loadBills, saveBillFile };

/** The OpenAI client reads the key from process.env, which the dev server doesn't fill from .env. */
export function loadApiKey() {
	if (!env.OPENAI_API_KEY) error(500, 'OPENAI_API_KEY is not set in .env');
	process.env.OPENAI_API_KEY ??= env.OPENAI_API_KEY;
}
