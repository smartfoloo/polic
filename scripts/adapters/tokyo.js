// 東京都議会. The assembly's session page gives number, title and result. Content for the
// governor's ordinances comes from the TMG press release (条例案概要): category, 所管局, 概要,
// and a PDF per bill. Member bills have no published text, so they are title-only.

import { committeeByDepartment } from '../../src/lib/config/committees.js';
import { billId, inScope, statusFrom, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml, tableRows } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName, squash, toNumber } from '../lib/text.js';

const PLENARY_SCHEDULE = 'https://www.gikai.metro.tokyo.lg.jp/schedule/plenary-session.html';

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

	const entry = await get(assembly.listPages[0].url);
	const [sessionLink] = findLinks(loadHtml(entry.body), entry.url, (t) => t === session.name);
	if (!sessionLink) return { bills, warnings: [`${session.name} not listed on ${entry.url}`] };

	const page = await get(sessionLink.href);
	const $ = loadHtml(page.body);
	const [pressLink] = findLinks($, page.url, (_, href) => href.includes('www.metro.tokyo.lg.jp/information/press/'));
	const press = pressLink ? await pressBills(pressLink.href, get) : new Map();
	if (!pressLink) warnings.push(`No press release link on ${page.url}`);
	const referred = await referralHappened(session, get);

	for (const h of $('h4').toArray()) {
		const heading = squash($(h).text());
		const by = heading.startsWith('知事提出') ? 'head' : heading.startsWith('議員提出') ? 'member' : null;
		if (!by) continue;

		for (const [numCell, titleCell, resultCell] of tableRows($, $(h).nextAll('table').first(), page.url)) {
			if (!numCell || !titleCell) continue;
			const numLabel = numCell.text.normalize('NFKC');
			const m = numLabel.match(by === 'head' ? /^第(\d+)号議案$/ : /^議員提出議案第(\d+)号$/);
			if (!m || !inScope(titleCell.text)) continue;
			const n = Number(m[1]);

			const info = by === 'head' ? press.get(n) : undefined;
			const committee = info ? (committeeByDepartment.tokyo[info.dept] ?? null) : null;
			if (info && !committee) warnings.push(`${numLabel}: no committee mapping for 所管局 「${info.dept}」`);
			if (by === 'head' && !info) warnings.push(`${numLabel}: not found in the press release`);

			const st = statusFrom(resultCell?.text ?? '', referred && committee !== null);
			if (!st) {
				warnings.push(`${numLabel}: unrecognised result 「${resultCell?.text}」, skipped`);
				continue;
			}

			const sources = [{ label: `${session.name} 提出議案と議決結果`, url: page.url, fetchedAt: page.fetchedAt }];
			let input = '';
			if (info) {
				sources.push({ label: '条例案概要（東京都）', url: info.pressUrl, fetchedAt: info.pressFetchedAt });
				sources.push({ label: `第${n}号議案（PDF）`, url: info.pdfUrl, fetchedAt: info.pdfFetchedAt });
				input = `【条例案概要】\n分野: ${info.category}\n所管: ${info.dept}\n${info.summary}\n\n【議案本文】\n${info.pdfText}\n`;
			}

			bills.push({
				facts: {
					id: billId(assembly.id, s, n, by),
					assembly: assembly.id,
					number: numLabel,
					official: titleCell.text,
					by,
					session: session.name,
					committee,
					...st,
					// No vote dates are published, so the date stays the submission date.
					dateKind: '提案',
					date: info?.date ?? null,
					...(by === 'member' ? { titleOnly: true } : {}),
					sources
				},
				input
			});
		}
	}
	return { bills, warnings };
}

// The press release is a flat run of: h1 category, h2 range, then per bill (or group of bills)
// a table [no | title + PDF link | 所管局] followed by 概要 / 例 / 施行期日 headings and paragraphs.
/**
 * @param {string} url
 * @param {Get} get
 */
async function pressBills(url, get) {
	const res = await get(url);
	const $ = loadHtml(res.body);
	/** @type {{ category: string, dept: string, pdfs: string[], text: string[] }[]} */
	const blocks = [];
	let category = '';
	/** @type {(typeof blocks)[number] | null} */
	let current = null;

	for (const el of $('table').first().parent().children().toArray()) {
		const tag = 'tagName' in el ? el.tagName : '';
		const text = squash($(el).text());
		if (tag === 'h1') {
			category = text;
			current = null;
		} else if (tag === 'h2') {
			current = null;
		} else if (tag === 'table') {
			const pdfs = $(el).find('a[href*="/documents/"]').toArray().map((a) => new URL(/** @type {string} */ ($(a).attr('href')), res.url).href);
			if (!pdfs.length) continue;
			current = { category, dept: squash($(el).find('td').last().text()), pdfs, text: [] };
			blocks.push(current);
		} else if (current && text) {
			current.text.push(/^h[3-6]$/.test(tag) ? `【${text}】` : text);
		}
	}

	// Each bill PDF opens with its own number (第百六十四号議案), which is how we match rows.
	/** @type {Map<number, { category: string, dept: string, summary: string, pdfUrl: string, pdfText: string, pdfFetchedAt: string, date: string | null, pressUrl: string, pressFetchedAt: string }>} */
	const byNumber = new Map();
	for (const b of blocks) {
		for (const pdfUrl of b.pdfs) {
			const pdf = await get(pdfUrl);
			const text = await pdfText(pdf.body);
			const num = text.match(/第([〇一二三四五六七八九十百千]+)号議案/);
			if (!num) continue;
			byNumber.set(toNumber(num[1]), {
				category: b.category,
				dept: b.dept,
				summary: b.text.join('\n'),
				pdfUrl,
				pdfText: text,
				pdfFetchedAt: pdf.fetchedAt,
				date: submittedDate(text),
				pressUrl: res.url,
				pressFetchedAt: res.fetchedAt
			});
		}
	}
	return byNumber;
}

// Bills go to committee on a set plenary day (議案の常任委員会への付託の決定). The schedule page only
// covers the current session, so past sessions count as referred.
/**
 * @param {import('../../src/lib/config/assemblies.js').Session} session
 * @param {Get} get
 */
async function referralHappened(session, get) {
	const today = new Date().toISOString().slice(0, 10);
	if (today > session.closes) return true;
	if (today < session.opened) return false;

	const res = await get(PLENARY_SCHEDULE);
	const $ = loadHtml(res.body);
	const [year, openMonth, openDay] = session.opened.split('-').map(Number);
	if (!squash($('body').text()).includes(`${openMonth}月${openDay}日から`)) return false;

	for (const tr of $('tr').toArray()) {
		const row = squash($(tr).text());
		const d = row.match(/(\d+)月(\d+)日/);
		if (d && row.includes('付託の決定')) {
			const iso = `${year}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}`;
			return today >= iso;
		}
	}
	return false;
}
