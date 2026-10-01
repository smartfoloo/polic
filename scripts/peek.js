// Fetches one page through the polite fetcher (so it lands in cache/ for scripts/try.js) and prints
// its tables, links or text. For researching a site before writing its adapter. Off-peak only.
// Usage: node --env-file=.env scripts/peek.js <url> [--tables] [--links <regex>] [--text] [--pdf]

import { allowHosts, assertOffPeak, politeFetch } from './lib/fetch.js';
import { loadHtml, tableGrid } from './lib/html.js';
import { pdfText } from './lib/pdf.js';
import { squash } from './lib/text.js';

const [href, ...opts] = process.argv.slice(2);
const opt = (/** @type {string} */ name) => opts.indexOf(name);
assertOffPeak();
allowHosts([new URL(href).host]);
const res = await politeFetch(href);
console.log(`# ${res.url} (${res.contentType}, ${res.body.length} bytes, ${res.source})`);

if (opt('--pdf') >= 0 || res.contentType.includes('pdf')) {
	const text = await pdfText(res.body);
	console.log(text.slice(0, Number(opts[opt('--pdf') + 1]) || 3000));
} else {
	const $ = loadHtml(res.body, res.contentType);
	console.log(`title: ${squash($('title').text())}`);
	if (opt('--tables') >= 0) {
		$('table').each((i, t) => {
			console.log(`\n## table ${i}`);
			for (const row of tableGrid($, t)) console.log('  ' + row.map((c) => c.slice(0, 60)).join(' | '));
		});
	}
	if (opt('--links') >= 0) {
		const re = new RegExp(opts[opt('--links') + 1] ?? '.');
		$('a[href]').each((_, a) => {
			const text = squash($(a).text());
			const url = new URL(/** @type {string} */ ($(a).attr('href')), res.url).href;
			if (re.test(text) || re.test(url)) console.log(`  ${text.slice(0, 70)} → ${url}`);
		});
	}
	if (opt('--text') >= 0) console.log(squash($('main, #main, #contents, body').first().text()).slice(0, Number(opts[opt('--text') + 1]) || 4000));
}
