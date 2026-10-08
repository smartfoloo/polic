// 日の出町議会. The 審議結果 category links 「令和8年第1回定例会　議案結果」. Bills are grouped under an h2 per
// proposer and submission day (「町長提出議案（2月27日）」), each an h3 「議案番号6」 followed by 「・件名 … ・審議結果
// …」. The result may name a committee and dates: 「予算決算常任委員会に付託（2月27日） 原案可決（3月17日）」. No
// bill texts are published, so bills are title-only.

import { billId, inScope, outcome } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');

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

	const index = await get(assembly.listPages[0].url);
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === key(`${session.name}議案結果`));
	if (!link) return { bills, warnings: [`${session.name} is not on ${index.url} yet`] };
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);
	const date = (/** @type {string} */ m, /** @type {string} */ d) => `${s.year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

	/** @type {'head' | 'member'} */
	let by = 'head';
	/** @type {string | null} */
	let submitted = null;
	for (const el of $('h2, h3').toArray()) {
		const text = key($(el).text());
		if (el.tagName === 'h2') {
			const m = text.match(/^(町長|議員)提出議?案?\((\d+)月(\d+)日\)$/);
			if (m) [by, submitted] = [m[1] === '議員' ? 'member' : 'head', date(m[2], m[3])];
			continue;
		}
		const n = Number(text.match(/^議案番号(\d+)$/)?.[1]);
		if (!n) continue;
		const body = squash($(el).nextAll('div').first().text());
		const m = body.match(/・件名\s*(.+?)\s*・審議結果\s*(.*)$/);
		if (!m || !inScope(m[1])) continue;
		const label = by === 'member' ? `議員提出議案第${n}号` : `議案第${n}号`;
		const result = key(m[2]);
		const committee = result.match(/^(.+?委員会)に付託/)?.[1] ?? null;
		const voted = result.match(/(?:可決|否決)\((\d+)月(\d+)日\)/);
		const out = outcome(result.replace(/^.+?委員会に付託(\(.*?\))?/, ''), committee, submitted, voted ? date(voted[1], voted[2]) : null);
		if (!out) {
			warnings.push(`${label}: unrecognised result 「${m[2]}」, skipped`);
			continue;
		}
		bills.push({
			facts: {
				id: billId(assembly.id, s, n, by),
				assembly: assembly.id,
				number: label,
				official: m[1],
				by,
				session: session.name,
				committee,
				...out,
				titleOnly: true,
				sources: [{ label: `${session.name} 議案結果`, url: page.url, fetchedAt: page.fetchedAt }]
			},
			input: ''
		});
	}
	return { bills, warnings };
}
