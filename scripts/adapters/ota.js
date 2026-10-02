// 大田区議会. A year page (r_8/index.html) links each session's page (「第2回定例会」), which links
// 区長提出議案 / 議員提出議案 / 委員会提出議案 pages. Each holds one table, 番号 | 件名 | 議決日 | 議決内容 |
// 付託委員会 (abbreviated: 総務財政), and PDF links that bundle several bills: 「第59号議案から第66号議案（PDF…）」.

import { billId, inScope, outcome, splitBills, stripFileNote, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseReiwaDate, parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');

const pages = /** @type {const} */ ([
	['区長提出議案', 'head', ''],
	['議員提出議案', 'member', '議員提出'],
	['委員会提出議案', 'committee', '委員会提出']
]);

/**
 * @param {import('../../src/lib/config/assemblies.js').Assembly} assembly
 * @param {import('../../src/lib/config/assemblies.js').Session} session
 * @param {(url: string) => Promise<import('../lib/fetch.js').FetchResult>} get
 */
export async function collect(assembly, session, get) {
	/** @type {Collected[]} */
	const bills = [];
	/** @type {string[]} */
	const warnings = [];
	const s = parseSessionName(session.name);
	if (!s) return { bills, warnings: [`Unrecognised session name ${session.name}`] };

	let sessionLink = null;
	for (const { url } of assembly.listPages) {
		const year = await get(url);
		[sessionLink] = findLinks(loadHtml(year.body, year.contentType), year.url, (t) => key(t) === `第${s.n}回${s.kind}`);
		if (sessionLink) break;
	}
	if (!sessionLink) return { bills, warnings: [`${session.name} is not on any of the listed year pages`] };
	const sessionPage = await get(sessionLink.href);
	const $session = loadHtml(sessionPage.body, sessionPage.contentType);

	for (const [label, by, prefix] of pages) {
		const [link] = findLinks($session, sessionPage.url, (t) => key(t) === label);
		if (!link) continue;
		const page = await get(link.href);
		const $ = loadHtml(page.body, page.contentType);

		// Bill number → the PDF holding it, from 「第59号議案から第66号議案」 or 「第58号議案」.
		/** @type {Map<number, string>} */
		const pdfFor = new Map();
		$('a[href$=".pdf"]').each((_, a) => {
			const m = key($(a).text()).match(/^第(\d+)号議案(?:から第(\d+)号議案)?/);
			if (!m) return;
			const href = new URL(/** @type {string} */ ($(a).attr('href')), page.url).href;
			for (let n = Number(m[1]); n <= Number(m[2] ?? m[1]); n++) pdfFor.set(n, href);
		});
		/** @typedef {{ text: string, texts: Map<number, string>, fetchedAt: string }} Pdf */
		/** @type {Map<string, Promise<Pdf>>} */
		const pdfs = new Map();
		const pdf = (/** @type {string} */ href) => {
			if (!pdfs.has(href))
				pdfs.set(href, get(href).then(async (res) => {
					const text = await pdfText(res.body);
					return { text, texts: splitBills(text), fetchedAt: res.fetchedAt };
				}));
			return /** @type {Promise<Pdf>} */ (pdfs.get(href));
		};

		for (const tr of $('table tr').toArray().slice(1)) {
			const tds = $(tr).children('td').toArray().map((td) => squash($(td).text()));
			if (tds.length !== 5) continue;
			const [numText, title, voteDay, result, committeeCell] = tds;
			const n = Number(numText.normalize('NFKC'));
			if (!Number.isInteger(n) || n < 1) continue;
			const number = `${prefix}第${n}号議案`;
			const official = stripFileNote(title);
			if (!inScope(official)) continue;
			if (by === 'committee') {
				warnings.push(`${number} (committee bill) skipped: not supported yet`);
				continue;
			}

			const c = key(committeeCell);
			const committee = c ? (c.endsWith('委員会') ? c : `${c}委員会`) : null;
			const sources = [{ label: `${session.name}${label}`, url: page.url, fetchedAt: page.fetchedAt }];
			let input = '';
			let submitted = null;
			const href = pdfFor.get(n);
			if (href) {
				const { text: whole, texts, fetchedAt } = await pdf(href);
				// A one-bill PDF needs no heading to cut at.
				const text = texts.get(n) ?? ([...pdfFor.values()].filter((h) => h === href).length === 1 ? whole : null);
				if (text) {
					submitted = submittedDate(text);
					input = `【議案本文】\n${text}\n`;
					sources.push({ label: `${number}（PDF）`, url: href, fetchedAt });
				} else {
					warnings.push(`${number}: not found in ${href}`);
				}
			} else {
				warnings.push(`${number}: no bill PDF found`);
			}

			const out = outcome(result, committee, submitted, parseReiwaDate(voteDay));
			if (!out) {
				warnings.push(`${number}: unrecognised result 「${result}」, skipped`);
				continue;
			}
			bills.push({
				facts: { id: billId(assembly.id, s, n, by), assembly: assembly.id, number, official, by, session: session.name, committee, ...out, sources },
				input
			});
		}
	}
	return { bills, warnings };
}
