// Bill files: data/<assembly slug>/<id>.json (committed). Source text for drafting goes to
// cache/text/<id>.txt (gitignored — it is the assemblies' copyrighted prose).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const FACT_KEYS = /** @type {const} */ (['number', 'official', 'by', 'session', 'committee', 'stage', 'status', 'dateKind', 'date', 'titleOnly']);

/** @param {string} path */
async function readJson(path) {
	try {
		return JSON.parse(await readFile(path, 'utf8'));
	} catch {
		return null;
	}
}

/**
 * @param {string} path
 * @param {string} content
 */
async function write(path, content) {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, content);
}

/** @param {string} id */
export function textPath(id) {
	return `cache/text/${id}.txt`;
}

/**
 * Writes parsed facts, keeping everything a person or the drafting step added.
 * Sources are only refreshed when facts change, so routine runs don't churn git.
 * @param {import('./bills.js').Collected} collected
 * @returns {Promise<'new' | 'updated' | 'unchanged'>}
 */
export async function saveBill({ facts, input }) {
	const path = `data/${facts.assembly.split('/').pop()}/${facts.id}.json`;
	const existing = await readJson(path);
	const changed = !existing || FACT_KEYS.some((k) => JSON.stringify(existing[k]) !== JSON.stringify(facts[k]));

	await write(textPath(facts.id), input);
	if (!changed) return 'unchanged';

	const { id, assembly, sources, ...rest } = facts;
	const bill = {
		id,
		assembly,
		approved: existing?.approved ?? false,
		...(existing?.approved ? { factsUpdated: new Date().toISOString().slice(0, 10) } : {}),
		...rest,
		sources,
		// Everything below is written by the drafting step or a reviewer and never touched here.
		...Object.fromEntries(Object.entries(existing ?? {}).filter(([k]) => !(k in facts) && !FACT_KEYS.includes(/** @type {any} */ (k)) && !['approved', 'factsUpdated'].includes(k)))
	};
	await write(path, JSON.stringify(bill, null, '\t') + '\n');
	return existing ? 'updated' : 'new';
}
