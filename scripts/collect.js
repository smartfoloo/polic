// Runs each assembly's adapter for every session in the config and writes data/<assembly>/*.json.
// Usage: npm run collect [-- --daytime]

import { assemblies, allHosts } from '../src/lib/config/assemblies.js';
import * as shibuya from './adapters/shibuya.js';
import * as suginami from './adapters/suginami.js';
import * as tokyo from './adapters/tokyo.js';
import { allowHosts, assertOffPeak, CrawlStopped, politeFetch } from './lib/fetch.js';
import { saveBill } from './lib/store.js';

/** @type {Record<string, { collect: typeof tokyo.collect }>} */
const adapters = { tokyo, 'tokyo/shibuya': shibuya, 'tokyo/suginami': suginami };
let stopped = 0;

try {
	assertOffPeak();
	allowHosts(allHosts);
	for (const assembly of assemblies) {
		try {
			for (const session of assembly.sessions) {
				const { bills, warnings } = await adapters[assembly.id].collect(assembly, session, politeFetch);
				const counts = { new: 0, updated: 0, unchanged: 0 };
				for (const b of bills) counts[await saveBill(b)]++;
				console.log(`${assembly.name} ${session.name}: ${bills.length} bills (${counts.new} new, ${counts.updated} updated)`);
				for (const w of warnings) console.log(`  ! ${w}`);
			}
		} catch (err) {
			// A problem with one site skips that assembly for this run; the others carry on.
			if (!(err instanceof CrawlStopped && err.host)) throw err;
			stopped++;
			console.error(`Skipped ${assembly.name} (rest of this run): ${err.message}`);
		}
	}
} catch (err) {
	if (err instanceof CrawlStopped) {
		console.error(`Stopped: ${err.message}`);
		process.exit(1);
	}
	throw err;
}

if (stopped) process.exit(1);
