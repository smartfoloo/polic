// 多摩市議会. 会議結果 → 「令和8年第2回定例会会議結果」: one table per kind under （1）市長提出議案, （2）委員会提出議案,
// （3）議員提出議案, columns 議案番号 | 提出月日 | 議案名 | 議決月日 | 議決番号 | 議決結果 (dates without the year).
// Posted once the session closes. No committee is published. Mayor bill PDFs are bundled by number range on
// 提出（予定）議案 → 「令和8年第2回定例会提出（予定）議案」 (「第79号議案から第104号議案まで（…）」); only bundles holding a
// bill we keep are fetched, since the accounts run to 20 MB. Member bills have no text online.

import { billId, inScope, outcome, splitBills, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml, tableGrid } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');
const KINDS = /** @type {const} */ ([
	['市長提出議案', 'head'],
	['委員会提出議案', 'committee'],
	['議員提出議案', 'member']
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
	const [resultsYear, textsYear] = assembly.listPages;
	const name = key(session.name);
	const isoDate = (/** @type {string} */ md) => {
		const m = key(md).match(/^(\d+)月(\d+)日$/);
		return m ? `${s.year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
	};

	const ry = await get(resultsYear.url);
	const [resultsLink] = findLinks(loadHtml(ry.body, ry.contentType), ry.url, (t) => key(t) === `${name}会議結果`);
	if (!resultsLink) return { bills, warnings: [`No 会議結果 page for ${session.name} yet`] };
	const page = await get(resultsLink.href);
	const $ = loadHtml(page.body, page.contentType);

	/** @type {{ by: 'head' | 'member' | 'committee', n: number, official: string, result: string, voteDate: string | null }[]} */
	const rows = [];
	for (const table of $('table').toArray()) {
		const heading = key($(table).prevAll('h2, h3, h4').first().text());
		const by = KINDS.find(([label]) => heading.endsWith(label))?.[1];
		if (!by) continue;
		const [header, ...body] = tableGrid($, table);
		const [cNum, cTitle, cVote, cResult] = ['議案番号', '議案名', '議決月日', '議決結果'].map((h) => header.map(key).indexOf(h));
		for (const row of body) {
			const n = Number(key(row[cNum] ?? ''));
			const official = squash(row[cTitle] ?? '');
			if (Number.isInteger(n) && n > 0 && inScope(official)) rows.push({ by, n, official, result: key(row[cResult] ?? ''), voteDate: isoDate(row[cVote] ?? '') });
		}
	}

	// Mayor bill texts, fetching only the bundles that hold a bill we keep.
	/** @type {Map<number, string>} */
	const texts = new Map();
	/** @type {Map<number, { url: string, fetchedAt: string }>} */
	const textSource = new Map();
	const wanted = new Set(rows.filter((r) => r.by === 'head').map((r) => r.n));
	const ty = await get(textsYear.url);
	const [textsLink] = findLinks(loadHtml(ty.body, ty.contentType), ty.url, (t) => key(t) === `${name}提出(予定)議案`);
	if (textsLink && wanted.size) {
		const tp = await get(textsLink.href);
		for (const l of findLinks(loadHtml(tp.body, tp.contentType), tp.url, (_, h) => h.endsWith('.pdf'))) {
			const m = key(l.text).match(/^第(\d+)号議案(?:から第(\d+)号議案まで)?/);
			if (!m || ![...wanted].some((n) => n >= Number(m[1]) && n <= Number(m[2] ?? m[1]))) continue;
			const res = await get(l.href);
			for (const [n, text] of splitBills(await pdfText(res.body))) {
				texts.set(n, text);
				textSource.set(n, { url: l.href, fetchedAt: res.fetchedAt });
			}
		}
	} else if (wanted.size) {
		warnings.push(`No 提出（予定）議案 page for ${session.name}`);
	}

	for (const r of rows) {
		const number = r.by === 'member' ? `議員提出議案第${r.n}号` : r.by === 'committee' ? `委員会提出議案第${r.n}号` : `第${r.n}号議案`;
		if (r.by === 'committee') {
			warnings.push(`${number} (committee bill) skipped: not supported yet`);
			continue;
		}
		const sources = [{ label: `${session.name}会議結果`, url: page.url, fetchedAt: page.fetchedAt }];
		const text = r.by === 'head' ? (texts.get(r.n) ?? '') : '';
		const src = textSource.get(r.n);
		if (text && src) sources.push({ label: `${number}（PDF）`, ...src });
		else if (r.by === 'head') warnings.push(`${number}: no bill text found`);

		const out = outcome(r.result, null, text ? submittedDate(text) : null, r.voteDate);
		if (!out) {
			warnings.push(`${number}: unrecognised result 「${r.result}」, skipped`);
			continue;
		}
		bills.push({
			facts: {
				id: billId(assembly.id, s, r.n, r.by),
				assembly: assembly.id,
				number,
				official: r.official,
				by: r.by,
				session: session.name,
				committee: null,
				...out,
				sources,
				...(text ? {} : { titleOnly: true })
			},
			input: text ? `【議案本文】\n${text}\n` : ''
		});
	}
	return { bills, warnings };
}
