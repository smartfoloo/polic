// Runs one assembly's adapter against pages already in cache/, without touching the network, and
// prints what it would save. For building and checking adapters on pages saved by hand.
// Usage: node scripts/try.js <assembly id> [session name] [--text]
//   --text  also print the start of each bill's source text
// PDFs that weren't saved are replaced by one that was, so a few saved PDFs are enough to test parsing
// (their text and submission dates are then wrong, and marked as a placeholder).
// Import pages saved from a browser first: node scripts/try.js --import <file.json>
//   (a JSON array of { url, contentType, base64 })

import { readdir, readFile } from 'node:fs/promises';
import { assemblies } from '../src/lib/config/assemblies.js';
import { adapters } from './adapters/index.js';
import { cacheOnlyFetch, saveToCache } from './lib/fetch.js';

const args = process.argv.slice(2);

if (args[0] === '--import') {
	const pages = JSON.parse(await readFile(args[1], 'utf8'));
	for (const p of pages) await saveToCache(p.url, Buffer.from(p.base64, 'base64'), p.contentType);
	console.log(`Imported ${pages.length} pages into cache/`);
	process.exit(0);
}

/** @type {import('./lib/fetch.js').FetchResult | null} */
let somePdf = null;
/** @param {string} url */
async function get(url) {
	try {
		const res = await cacheOnlyFetch(url);
		if (url.endsWith('.pdf')) somePdf = res;
		return res;
	} catch (err) {
		if (!url.endsWith('.pdf')) throw err;
		somePdf ??= await anyCachedPdf(new URL(url).host);
		if (!somePdf) throw err;
		console.log(`    (placeholder PDF for ${url})`);
		return { ...somePdf, url };
	}
}

/** Any PDF already saved for this host, to stand in for ones that weren't. */
async function anyCachedPdf(/** @type {string} */ host) {
	for (const f of (await readdir(`cache/${host}`)).filter((f) => f.endsWith('.json'))) {
		const meta = JSON.parse(await readFile(`cache/${host}/${f}`, 'utf8'));
		if (meta.url.endsWith('.pdf')) return cacheOnlyFetch(meta.url);
	}
	return null;
}

const [id, sessionName] = args.filter((a) => !a.startsWith('--'));
const assembly = assemblies.find((a) => a.id === id);
if (!assembly) throw new Error(`Unknown assembly ${id}`);

for (const session of assembly.sessions.filter((s) => !sessionName || s.name === sessionName)) {
	try {
		const { bills, warnings } = await adapters[assembly.id].collect(assembly, session, get);
		console.log(`\n${assembly.name} ${session.name}: ${bills.length} bills`);
		for (const { facts: f, input } of bills) {
			console.log(`  ${f.id}  ${f.number}  ${f.status}/${f.stage}  ${f.dateKind} ${f.date}  ${f.committee ?? '(no committee)'}`);
			console.log(`    ${f.official}`);
			console.log(`    sources: ${f.sources.map((s) => s.label).join(' · ')}  text: ${input.length} chars`);
			if (args.includes('--text')) console.log(`    ${input.slice(0, 200).replace(/\n/g, ' ')}`);
		}
		for (const w of warnings) console.log(`  ! ${w}`);
	} catch (err) {
		console.log(`\n${assembly.name} ${session.name}: ${/** @type {Error} */ (err).message}`);
	}
}
