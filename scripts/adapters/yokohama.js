// 横浜市会. The 本会議の結果／議案 index links one 「議案一覧（令和8年第2回定例会）」 page per session. Its table of
// contents has an h3 per submission day (「5月20日提出」) listing that day's sections by anchor; each section
// (h3 with an anchor: 条例の制定, 条例の一部改正, …) lists bills as h4 「議案名：…」, h5 「議案番号：市第２号議案」 →
// PDF, a 内容 paragraph and h6 「結果：可決」. Bills are numbered per series: 市 (mayor), 水 (water), 交
// (transport), 病 (hospitals) and 議 (members). No committee or vote date is published per bill.

import { billId, inScope, outcome } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');
const SERIES = /** @type {Record<string, string>} */ ({ 市: '', 水: 'sui', 交: 'ko', 病: 'byo', 議: '' });

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
	const [link] = findLinks(loadHtml(index.body, index.contentType), index.url, (t) => key(t) === key(`議案一覧（${session.name}）`));
	if (!link) return { bills, warnings: [`${session.name} is not on ${index.url}`] };
	const page = await get(link.href);
	const $ = loadHtml(page.body, page.contentType);

	// Section anchor → submission date, from the table of contents.
	/** @type {Map<string, string>} */
	const submittedBy = new Map();
	for (const h3 of $('h3').toArray()) {
		const d = key($(h3).text()).match(/^(\d+)月(\d+)日提出$/);
		if (!d) continue;
		const box = $(h3).closest('.h3bg').length ? $(h3).closest('.h3bg').next() : $(h3).next();
		for (const a of box.find('a[href^="#"]').toArray()) {
			submittedBy.set(/** @type {string} */ ($(a).attr('href')).slice(1), `${s.year}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}`);
		}
	}

	/** @type {{ official: string, number: string, pdf: string | null, content: string[], result: string | null, submitted: string | null }[]} */
	const found = [];
	/** @type {string | null} */
	let section = null;
	let inContent = false;
	for (const el of $('h3, h4, h5, h6, p').toArray()) {
		const text = squash($(el).text());
		const current = found.at(-1);
		if (el.tagName === 'h3') {
			section = $(el).find('a[id]').attr('id') ?? section;
			inContent = false;
		} else if (el.tagName === 'h4' && text.startsWith('議案名：')) {
			found.push({ official: text.slice(4), number: '', pdf: null, content: [], result: null, submitted: section ? (submittedBy.get(section) ?? null) : null });
			inContent = false;
		} else if (el.tagName === 'h5' && current && text.startsWith('議案番号：')) {
			current.number = key(text.slice(5)).replace(/\(PDF.*$/, '');
			const pdf = $(el).find('a[href$=".pdf"]').attr('href');
			current.pdf = pdf ? new URL(pdf, page.url).href : null;
		} else if (el.tagName === 'h6' && current) {
			inContent = text.startsWith('内容');
			if (text.startsWith('結果')) current.result = text.replace(/^結果[：:]/, '').trim();
		} else if (el.tagName === 'p' && current && inContent) current.content.push(text);
	}

	for (const b of found) {
		const m = b.number.match(/^(市|水|交|病|議)第(\d+)号議案$/);
		if (!m || !inScope(b.official)) continue;
		const by = m[1] === '議' ? 'member' : 'head';
		const n = Number(m[2]);
		const sources = [{ label: `議案一覧（${session.name}）`, url: page.url, fetchedAt: page.fetchedAt }];
		let input = b.content.length ? `【内容】\n${b.content.join('\n')}\n` : '';
		if (b.pdf) {
			const res = await get(b.pdf);
			input += `\n【議案本文】\n${await pdfText(res.body)}\n`;
			sources.push({ label: `${b.number}（PDF）`, url: b.pdf, fetchedAt: res.fetchedAt });
		} else warnings.push(`${b.number}: no bill PDF found`);

		const out = outcome(b.result ?? '', null, b.submitted, null, { committeeUnknown: true });
		if (!out) {
			warnings.push(`${b.number}: unrecognised result 「${b.result}」, skipped`);
			continue;
		}
		bills.push({
			facts: { id: billId(assembly.id, s, n, by, SERIES[m[1]]), assembly: assembly.id, number: b.number, official: b.official, by, session: session.name, committee: null, ...out, sources },
			input
		});
	}
	return { bills, warnings };
}
