// 川崎市議会. The year category links 「令和8年 第2回川崎市議会定例会会議結果（議案、議決結果等）」. That page links a
// PDF per bill (「議案第76号 川崎市市税条例の一部を改正する条例の制定について(PDF…)」, member bills 「議員提出議案第1号
// …」) and, once votes are taken, 議決結果 PDFs per proposer: 「第76号title令和8年6月18日原案可決賛成賛成…」. Results are
// matched to bills by number within each proposer's PDF. Committees are only given as counts, so none are read.

import { billId, inScope, outcome, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');
const RESULT = /第(\d+)号.+?令和(\d+)年(\d+)月(\d+)日(原案可決|修正可決|可決|否決|継続審査|承認|同意|認定)/g;

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
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) =>
		key(t).replace('川崎市議会', '').startsWith(key(`${session.name}会議結果`))
	);
	if (!link) return { bills, warnings: [`${session.name} is not on ${index.url} yet`] };
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);

	// Results per proposer: bill number → { result, voteDate }.
	/** @type {Record<'head' | 'member', Map<number, { result: string, voteDate: string }>>} */
	const results = { head: new Map(), member: new Map() };
	/** @type {Record<'head' | 'member', import('../lib/fetch.js').FetchResult | null>} */
	const resultPdfs = { head: null, member: null };
	for (const [by, label] of /** @type {const} */ ([['head', '議決結果(市長提出議案)'], ['member', '議決結果(議員提出議案)']])) {
		const [r] = findLinks($, page.url, (t) => key(t).startsWith(label));
		if (!r) continue;
		const pdf = await get(r.href);
		resultPdfs[by] = pdf;
		const text = key(await pdfText(pdf.body));
		for (const m of text.matchAll(RESULT)) {
			const voteDate = `${Number(m[2]) + 2018}-${m[3].padStart(2, '0')}-${m[4].padStart(2, '0')}`;
			results[by].set(Number(m[1]), { result: m[5], voteDate });
		}
	}

	for (const a of findLinks($, page.url, (t) => /^(議員提出)?議案第\d+号/.test(key(t)))) {
		const m = squash(a.text).match(/^(議員提出)?議案第\s*(\d+)\s*号\s*(.+?)\s*\(PDF/);
		if (!m || !inScope(m[3])) continue;
		const by = m[1] ? 'member' : 'head';
		const n = Number(m[2]);
		const label = by === 'member' ? `議員提出議案第${n}号` : `議案第${n}号`;
		const res = await get(a.href);
		const text = await pdfText(res.body);
		const r = results[by].get(n);
		const out = outcome(r?.result ?? '', null, submittedDate(text), r?.voteDate ?? null, { committeeUnknown: true });
		if (!out) {
			warnings.push(`${label}: unrecognised result 「${r?.result}」, skipped`);
			continue;
		}
		const resultPdf = resultPdfs[by];
		bills.push({
			facts: {
				id: billId(assembly.id, s, n, by),
				assembly: assembly.id,
				number: label,
				official: m[3],
				by,
				session: session.name,
				committee: null,
				...out,
				sources: [
					{ label: `${session.name} 会議結果`, url: page.url, fetchedAt: page.fetchedAt },
					{ label: `${label}（PDF）`, url: res.url, fetchedAt: res.fetchedAt },
					...(r && resultPdf ? [{ label: `${session.name} 議決結果`, url: resultPdf.url, fetchedAt: resultPdf.fetchedAt }] : [])
				]
			},
			input: `【議案本文】\n${text}\n`
		});
	}
	return { bills, warnings };
}
