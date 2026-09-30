// 港区・足立区・江戸川区 share one bill database ("g07": g07_giketsu.asp, Shift_JIS).
// The search page's session dropdown gives each session an id; the list for that session has a row per
// bill. Minato and Adachi link each bill to a detail page (committee, vote date, result, 概要, PDFs);
// Edogawa puts all of that in the list row (title + 概要 + PDF, result, 付託日 + committee).

import { billId, inScope, statusFrom, submittedDate } from '../lib/bills.js';
import { loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseReiwaDate, parseSessionName, squash } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */

// The site's own search form fields, all empty except the page size and the session (added per call).
const LIST_QUERY =
	'exp=&smode=3&nenfrom=&nento=&kword1=&kword2=&bunrui=&hutaku=&kensu=100&kekka=&Sflg=2&Kmode=0&FBKEY1=&FBKEY2=&TITL=&FYY=&FMM=&FDD=&TYY=&TMM=&TDD=&iPageNum=1';
const PAGE_SIZE = 100;

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');

/**
 * 議案第36号 / 第55号議案 (head) · 議員提出議案第1号 / 議員提出第1号議案 (member) · 委員会提出… (committee).
 * Anything else (区長報告, 報告, 同意, 諮問) isn't a bill we cover.
 * @returns {{ by: 'head' | 'member' | 'committee', n: number, label: string } | null}
 */
function parseNumber(/** @type {string} */ text) {
	const label = key(text);
	const m = label.match(/^(議員提出|委員会提出)?(?:議案)?第(\d+)号(?:議案)?$/);
	if (!m) return null;
	return { by: m[1] === '議員提出' ? 'member' : m[1] ? 'committee' : 'head', n: Number(m[2]), label };
}

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

	const entry = await get(assembly.listPages[0].url);
	const $e = loadHtml(entry.body, entry.contentType);
	const option = $e('select[name=kaigi] option')
		.toArray()
		.find((o) => key($e(o).text()) === key(session.name));
	if (!option) return { bills, warnings: [`${session.name} is not in the session list on ${entry.url}`] };

	const listUrl = new URL(`g07_giketsu.asp?${LIST_QUERY}&kaigi=${encodeURIComponent($e(option).attr('value') ?? '')}`, entry.url).href;
	const list = await get(listUrl);
	const $ = loadHtml(list.body, list.contentType);

	// Columns by header: 番号/議案番号, 件名/議案名, (議決)結果, and Edogawa's extra 付託委員会.
	const headers = $('tr:has(th)').first().children('th').toArray().map((th) => key($(th).text()));
	const col = (/** @type {RegExp} */ re) => headers.findIndex((h) => re.test(h));
	const [cNum, cTitle, cResult, cCommittee] = [col(/番号$/), col(/^(件名|議案名)$/), col(/結果/), col(/付託委員会/)];
	if (cNum < 0 || cTitle < 0) return { bills, warnings: [`No bill table on ${list.url}`] };

	const rows = $('tr')
		.toArray()
		.map((tr) => $(tr).children('td').toArray())
		.filter((tds) => tds.length > cTitle && parseNumber($(tds[cNum]).text()));
	if (rows.length >= PAGE_SIZE) warnings.push(`${rows.length} rows on ${list.url}: there may be a second page`);

	for (const tds of rows) {
		const num = /** @type {NonNullable<ReturnType<typeof parseNumber>>} */ (parseNumber($(tds[cNum]).text()));
		const titleCell = $(tds[cTitle]).clone();
		titleCell.find('.comment3, .fourdown').remove();
		const official = squash(titleCell.text());
		if (!inScope(official)) continue;
		if (num.by === 'committee') {
			warnings.push(`${num.label} (committee bill) skipped: not supported yet`);
			continue;
		}
		const by = num.by;

		const sources = [{ label: `${session.name} 議案一覧`, url: list.url, fetchedAt: list.fetchedAt }];
		/** @type {{ label: string, href: string }[]} */
		let pdfs;
		let summary = '';
		let committee = null;
		let resultText = '';

		const viewHref = $(tds[cTitle]).find('a[href*="g07_Giketsu_View"]').attr('href');
		if (viewHref) {
			// Minato, Adachi: facts and PDFs on the bill's own page. Its link carries the title as a
			// Shift_JIS query parameter; the id alone is enough.
			const id = viewHref.match(/SrchID=(\d+)/)?.[1];
			const view = await get(new URL(`g07_Giketsu_View.asp?SrchID=${id}&Sflg=2`, list.url).href);
			const $v = loadHtml(view.body, view.contentType);
			/** @type {Record<string, string>} */
			const facts = {};
			$v('dl.srchtag dt').each((_, dt) => {
				facts[key($v(dt).text()).split(/[(（]/)[0]] = squash($v(dt).next('dd').text());
			});
			committee = facts['付託委員会'] || null;
			resultText = [facts['議決年月日'], facts['議決結果']].filter(Boolean).join(' ');
			summary = squash(
				$v('h3')
					.filter((_, h) => key($v(h).text()) === '概要')
					.next('p')
					.text()
			);
			pdfs = $v('.gdocnews a[href$=".pdf"]')
				.toArray()
				.map((a) => ({ label: key($v(a).text()), href: new URL(/** @type {string} */ ($v(a).attr('href')), view.url).href }));
			sources.push({ label: `${num.label}の詳細`, url: view.url, fetchedAt: view.fetchedAt });
		} else {
			// Edogawa: everything is in the row.
			summary = squash($(tds[cTitle]).find('.comment3').text());
			pdfs = $(tds[cTitle])
				.find('a[href$=".pdf"]')
				.toArray()
				.map((a) => ({ label: key($(a).text()), href: new URL(/** @type {string} */ ($(a).attr('href')), list.url).href }));
			resultText = cResult >= 0 ? squash($(tds[cResult]).text()) : '';
			committee = cCommittee >= 0 ? (key($(tds[cCommittee]).text()).match(/([^\d日]+委員会)$/)?.[1] ?? null) : null;
		}

		// The result cell may add the vote count per 会派 (賛成/反対), never 可決/否決, after the outcome.
		const st = statusFrom(resultText.replace(/令和.{1,12}?日/, ''), committee !== null);
		if (!st) {
			warnings.push(`${num.label}: unrecognised result 「${resultText.slice(0, 30)}」, skipped`);
			continue;
		}

		let input = summary ? `【概要】\n${summary}\n` : '';
		let submitted = null;
		const bodyPdf = pdfs.find((p) => p.label.includes('本文'));
		const outlinePdf = pdfs.find((p) => p.label.includes('概要'));
		if (bodyPdf) {
			const res = await get(bodyPdf.href);
			const text = await pdfText(res.body);
			submitted = submittedDate(text);
			input += `\n【議案本文】\n${text}\n`;
			sources.push({ label: `${num.label}（PDF）`, url: bodyPdf.href, fetchedAt: res.fetchedAt });
		} else {
			warnings.push(`${num.label}: no bill PDF found`);
		}
		if (outlinePdf) {
			const res = await get(outlinePdf.href);
			input += `\n【議案の概要】\n${await pdfText(res.body)}\n`;
			sources.push({ label: `${num.label} 概要（PDF）`, url: outlinePdf.href, fetchedAt: res.fetchedAt });
		}

		const voted = st.stage === 3 ? parseReiwaDate(resultText) : null;
		bills.push({
			facts: {
				id: billId(assembly.id, s, num.n, by),
				assembly: assembly.id,
				number: num.label,
				official,
				by,
				session: session.name,
				committee,
				...st,
				dateKind: voted ? (st.status === '否決' ? '否決' : '可決') : '提案',
				date: voted ?? submitted,
				sources
			},
			input
		});
	}
	return { bills, warnings };
}
