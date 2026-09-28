// Reading and writing the committed bill files in data/.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** @returns {Promise<{ path: string, bill: any }[]>} */
export async function loadBills(dir = 'data') {
	let files;
	try {
		files = await readdir(dir, { recursive: true });
	} catch {
		return [];
	}
	const out = [];
	for (const f of files.filter((f) => f.endsWith('.json')).sort()) {
		const path = join(dir, f);
		out.push({ path, bill: JSON.parse(await readFile(path, 'utf8')) });
	}
	return out;
}

/**
 * @param {string} path
 * @param {any} bill
 */
export async function saveBillFile(path, bill) {
	await writeFile(path, JSON.stringify(bill, null, '\t') + '\n');
}
