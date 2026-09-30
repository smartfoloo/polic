// Runs each assembly's adapter for every session in the config and writes data/<assembly>/*.json.
// Usage: npm run collect [-- --daytime] [-- --only minato,taito]

import { assemblies, allHosts } from '../src/lib/config/assemblies.js';
import { adapters } from './adapters/index.js';
import { allowHosts, assertOffPeak, CrawlStopped, politeFetch } from './lib/fetch.js';
import { saveBill } from './lib/store.js';

let stopped = 0;

// --only takes the last part of assembly ids (tokyo/minato → minato).
const i = process.argv.indexOf('--only');
const only = i > 0 ? process.argv[i + 1]?.split(',') : null;
const selected = only ? assemblies.filter((a) => only.includes(a.id.split('/').pop() ?? '')) : assemblies;

try {
	assertOffPeak();
	allowHosts(allHosts);
	for (const assembly of selected) {
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
