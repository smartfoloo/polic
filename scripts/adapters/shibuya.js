// 渋谷区議会. The 議案等について page lists only the current session, with one PDF per bill.
// Committees come from the 担当所管一覧 PDF (department per bill). Results arrive after the
// session as a PDF whose table has to be read by text position.

import { committeeByDepartment } from '../../src/lib/config/committees.js';
import { billId, inScope, statusFrom, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml, tableRows } from '../lib/html.js';
import { pdfItems, pdfText } from '../lib/pdf.js';
import { parseSessionName, squash, titleKey } from '../lib/text.js';

const RESULT_WORD = /^(可決|否決|同意|不同意|承認|不承認|認定|不認定|採択|不採択)$/;

/** @typedef {import('../lib/bills.js').Collected} Collected */
/** @typedef {(url: string) => Promise<import('../lib/fetch.js').FetchResult>} Get */

/**
 * @param {import('../../src/lib/config/assemblies.js').Assembly} assembly
 * @param {import('../../src/lib/config/assemblies.js').Session} session
 * @param {Get} get
 */
export async function collect(assembly, session, get) {
	/** @type {Collected[]} */
	const bills = [];
	/** @type {string[]} */
	const warnings = [];
	const s = parseSessionName(session.name);
	if (!s) return { bills, warnings: [`Unrecognised session name ${session.name}`] };

	const list = await get(assembly.listPages[0].url);
	const $ = loadHtml(list.body);
	if (!squash($('body').text()).includes(`${session.name}議案等の概要`)) {
		return { bills, warnings: [`${session.name} is not the session listed on ${list.url} (only the current one is)`] };
	}

	const departments = await departmentText($, list.url, get);
	const results = await resultRows(assembly, session, get);
	if (!results) warnings.push(`No results PDF yet for ${session.name}; bills stay pending`);

	const table = $('table').toArray().find((t) => $(t).text().includes('議案番号'));
	for (const [numCell, titleCell] of table ? tableRows($, table, list.url) : []) {
		if (!numCell || !titleCell) continue;
		const numLabel = numCell.text.normalize('NFKC');
		const m = numLabel.match(/^(議員提出)?議案第(\d+)号$/);
		const official = titleCell.text.replace(/（PDF[^）]*）$/, '').trim();
		if (!m || !inScope(official)) continue;
		const by = m[1] ? 'member' : 'head';
		const n = Number(m[2]);

		const byDept = committeeByDepartment[assembly.id];
		const dept = departmentFor(departments, numLabel, Object.keys(byDept));
		const committee = dept ? byDept[dept] : null;
		if (by === 'head' && !committee) warnings.push(`${numLabel}: no committee found (department 「${dept ?? '?'}」)`);

		const result = results?.find((r) => r.key === titleKey(official))?.result ?? '';
		if (results && !result) warnings.push(`${numLabel}: not found in the results PDF`);
		// No referral date is published, so pending bills stay at 提案 until the results arrive.
		const st = statusFrom(result, false);
		if (!st) {
			warnings.push(`${numLabel}: unrecognised result 「${result}」, skipped`);
			continue;
		}

		const sources = [{ label: `${session.name} 議案等`, url: list.url, fetchedAt: list.fetchedAt }];
		let input = '';
		let submitted = null;
		if (titleCell.href) {
			const pdf = await get(titleCell.href);
			const text = await pdfText(pdf.body);
			submitted = submittedDate(text);
			input = `【議案本文】\n${text}\n`;
			sources.push({ label: `${numLabel}（PDF）`, url: titleCell.href, fetchedAt: pdf.fetchedAt });
		}
		if (results) sources.push({ label: `${session.name} 議案等の概要と結果（PDF）`, url: results.url, fetchedAt: results.fetchedAt });

		bills.push({
			facts: {
				id: billId(assembly.id, s, n, by),
				assembly: assembly.id,
				number: numLabel,
				official,
				by,
				session: session.name,
				committee,
				...st,
				dateKind: '提案',
				date: submitted,
				sources
			},
			input
		});
	}
	return { bills, warnings };
}

/**
 * @param {import('cheerio').CheerioAPI} $
 * @param {string} base
 * @param {Get} get
 */
async function departmentText($, base, get) {
	const [link] = findLinks($, base, (t) => t.includes('担当所管'));
	if (!link) return '';
	return (await pdfText((await get(link.href)).body)).normalize('NFKC');
}

// The 担当所管一覧 is a flat run of 「議案第47号 <title> <部> <課>」. Find the last known
// department name between this bill's number and the next one.
/**
 * @param {string} text
 * @param {string} numLabel
 * @param {string[]} names
 */
function departmentFor(text, numLabel, names) {
	const start = text.indexOf(numLabel);
	if (start < 0) return null;
	const rest = text.slice(start + numLabel.length);
	const next = rest.search(/(議員提出)?議案第\d+号|認定第|報告第|諮問第/);
	const chunk = next < 0 ? rest : rest.slice(0, next);
	let found = null;
	let at = -1;
	for (const name of names) {
		const i = chunk.lastIndexOf(name);
		if (i > at) [found, at] = [name, i];
	}
	return found;
}

// Each result word (可決, 否決, …) sits on the same line as its bill title in the left column.
/**
 * @param {import('../../src/lib/config/assemblies.js').Assembly} assembly
 * @param {import('../../src/lib/config/assemblies.js').Session} session
 * @param {Get} get
 */
async function resultRows(assembly, session, get) {
	const page = await get(assembly.listPages[1].url);
	const [link] = findLinks(loadHtml(page.body), page.url, (t) => t.includes(`${session.name}／議案等の概要と結果`));
	if (!link) return null;
	const pdf = await get(link.href);
	const items = await pdfItems(pdf.body);
	const rows = items
		.filter((i) => RESULT_WORD.test(i.str.trim()))
		.map((r) => {
			const title = items
				.filter((i) => i.page === r.page && i.x < 150 && Math.abs(i.y - r.y) < 25)
				.sort((a, b) => b.y - a.y || a.x - b.x)
				.map((i) => i.str)
				.join('');
			return { key: titleKey(title), result: r.str.trim() };
		});
	return Object.assign(rows, { url: link.href, fetchedAt: pdf.fetchedAt });
}
