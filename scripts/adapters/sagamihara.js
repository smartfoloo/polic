// 相模原市議会 (sagamihara-shigikai.jp). One 定例会 a year from April, meeting as 開会会議, 臨時会議 and month
// 定例会議; bill numbers run through the year. Results are a PDF per meeting (「6月定例会議・審議結果」): the
// 議会日誌, then records 「議案第65号 title 総務 7月1日 可決（賛成多数）」 whose titles wrap across lines and carry
// ruby readings (「杜／もり／のホール」). Bill texts are bundles by kind (「議案第65号〜93号（条例）」, up to 20 MB);
// member bills are one PDF each (「議提議案第5号」). The current meeting's bills are on the 提出議案 page, earlier
// ones on a page per session year. Some bills' own pages are scanned, leaving only their 関係資料 with text.

import { billId, inScope, outcome, submittedDate } from '../lib/bills.js';
import { findLinks, loadHtml } from '../lib/html.js';
import { pdfText } from '../lib/pdf.js';
import { parseSessionName } from '../lib/text.js';

/** @typedef {import('../lib/bills.js').Collected} Collected */
/** @typedef {(url: string) => Promise<import('../lib/fetch.js').FetchResult>} Get */

const key = (/** @type {string} */ s) => s.normalize('NFKC').replace(/\s+/g, '');
// Committees named in every meeting's 日誌 so far; the 日誌 adds any others.
const COMMITTEES = ['総務', '民生', '市民環境経済', 'こども文教', '建設'];

/**
 * A ruby reading is its own short hiragana line between a line ending in a kanji and one going on in hiragana.
 * @param {string[]} lines
 */
const dropRuby = (lines) =>
	lines.filter((l, i) => !(/^[ぁ-ん]{1,4}$/.test(l) && /\p{sc=Han}$/u.test(lines[i - 1] ?? '') && /^[ぁ-ん]/.test(lines[i + 1] ?? '')));

/**
 * Records from a results PDF, by label (議案第65号, 議提議案第5号).
 * @param {string} text
 * @param {number} sessionYear the 定例会's year; meetings before April fall in the next calendar year
 */
function parseResults(text, sessionYear) {
	const [diary, list = ''] = text.split(/＜審議結果一覧＞/);
	const committees = [...new Set([...COMMITTEES, ...[...key(diary).matchAll(/[)、]([^)、]+?)委員会/g)].map((m) => m[1])])].sort((a, b) => b.length - a.length);
	const lines = dropRuby(
		list
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l && !/^\d+$/.test(l) && !/^(番号件名付託|委員会議決日本会議の|議決結果)$/.test(l) && !/^陳情第.+?号は、/.test(l))
	);
	/** @type {Map<string, { title: string, committee: string | null, referred: boolean, voteDate: string, result: string }>} */
	const out = new Map();
	for (const rec of key(lines.join('')).split(/(?=(?:委員会提出議案|議提議案|(?<!議提|会提出)議案|陳情|請願)第\d+号)/)) {
		const m = rec.match(/^((?:委員会提出議案|議提議案|議案)第\d+号)(.+?)(\d+)月(\d+)日(.+)$/);
		if (!m) continue;
		let body = m[2];
		/** @type {string[]} */
		const named = [];
		for (let again = true; again; ) {
			again = false;
			if (body.endsWith('―')) {
				body = body.slice(0, -1);
				again = true;
			}
			const c = committees.find((c) => body.endsWith(c));
			if (c) {
				named.unshift(c);
				body = body.slice(0, -c.length);
				again = true;
			}
		}
		const month = Number(m[3]);
		const year = month < 4 ? sessionYear + 1 : sessionYear;
		out.set(m[1], {
			title: body,
			committee: named.length === 1 ? `${named[0]}委員会` : null,
			referred: named.length > 0,
			voteDate: `${year}-${String(month).padStart(2, '0')}-${m[4].padStart(2, '0')}`,
			result: m[5]
		});
	}
	return out;
}

/**
 * Bill number → its text, from a bundle. A bill starts at a line that is only 「議案第65号」 (「議提議案第1号」 for
 * member bills); its 関係資料 stays with it. A 関係資料 for another bill means that bill's own pages had no
 * text, so its 資料 is dropped.
 * @param {string} text
 * @param {'議案' | '議提議案'} prefix
 */
function splitBundle(text, prefix) {
	/** @type {Map<number, string>} */
	const out = new Map();
	/** @type {number | null} */
	let current = null;
	for (const line of text.split('\n')) {
		const k = key(line);
		const head = k.match(new RegExp(`^${prefix}第(\\d+)号$`));
		const annex = k.match(new RegExp(`^${prefix}第(\\d+)号関係資料$`));
		if (head) current = Number(head[1]);
		else if (annex && Number(annex[1]) !== current) current = null;
		if (current !== null) out.set(current, (out.get(current) ?? '') + line + '\n');
	}
	return out;
}

/**
 * The links listed for the meeting: on the 提出議案 page while it is current, else under its h2 on the past page
 * for its session year.
 * @param {import('../../src/lib/config/assemblies.js').Assembly} assembly
 * @param {string} name the session name
 * @param {number} year the 定例会's year
 * @param {Get} get
 */
async function meetingLinks(assembly, name, year, get) {
	const current = await get(assembly.listPages[2].url);
	const $c = loadHtml(current.body, current.contentType);
	if (findLinks($c, current.url, (t) => key(t).startsWith(`${key(name)}付議事件一覧`)).length) {
		return { page: current, links: findLinks($c, current.url, () => true) };
	}
	const past = await get(assembly.listPages[3].url);
	const [yearLink] = findLinks(loadHtml(past.body, past.contentType), past.url, (t) => key(t) === `過去の付議事件一覧・提出議案等(令和${year - 2018}年)`);
	if (!yearLink) return null;
	const page = await get(yearLink.href);
	const $ = loadHtml(page.body, page.contentType);
	/** @type {{ text: string, href: string }[]} */
	const links = [];
	let inMeeting = false;
	for (const el of $('h2, a[href]').toArray()) {
		if (el.tagName === 'h2') inMeeting = key($(el).text()) === key(name);
		else if (inMeeting) links.push({ text: $(el).text(), href: new URL(/** @type {string} */ ($(el).attr('href')), page.url).href });
	}
	return links.length ? { page, links } : null;
}

/**
 * The meeting's results PDF link: under 「令和8年定例会」 on the results page, else on the past page for the year.
 * @param {import('../../src/lib/config/assemblies.js').Assembly} assembly
 * @param {string} meeting the session name after 「令和8年定例会」 (「6月定例会議」, 「第1回臨時会議」)
 * @param {number} year
 * @param {Get} get
 */
async function resultsLink(assembly, meeting, year, get) {
	const label = (/** @type {string} */ t) => key(t).replace(/^令和\d+年/, '').replace(/^定例会/, '').replace(/\[PDF.*$/, '');
	const current = await get(assembly.listPages[0].url);
	const $ = loadHtml(current.body, current.contentType);
	let inYear = false;
	for (const el of $('h2, a[href]').toArray()) {
		if (el.tagName === 'h2') inYear = key($(el).text()) === `令和${year - 2018}年定例会`;
		else if (inYear && label($(el).text()) === `${meeting}・審議結果`) return new URL(/** @type {string} */ ($(el).attr('href')), current.url).href;
	}
	const past = await get(assembly.listPages[1].url);
	const [yearLink] = findLinks(loadHtml(past.body, past.contentType), past.url, (t) => key(t) === `過去の審議結果等(令和${year - 2018}年)`);
	if (!yearLink) return null;
	const page = await get(yearLink.href);
	return findLinks(loadHtml(page.body, page.contentType), page.url, (t) => label(t) === `${meeting}・審議結果`)[0]?.href ?? null;
}

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
	const meeting = key(session.name).replace(/^令和\d+年定例会(令和\d+年)?/, '');

	const listed = await meetingLinks(assembly, session.name, s.year, get);
	if (!listed) return { bills, warnings: [`${session.name}: no bill list found yet`] };

	// Results, once posted. Until then, bills come from the bundles as 審議中.
	const resultsHref = await resultsLink(assembly, meeting, s.year, get);
	const resultsPdf = resultsHref ? await get(resultsHref) : null;
	const results = resultsPdf ? parseResults(await pdfText(resultsPdf.body), s.year) : new Map();
	if (!resultsPdf) warnings.push(`${session.name}: no results PDF yet`);

	// Head bills: the 条例 bundles.
	/** @type {Map<number, { text: string, source: import('../lib/fetch.js').FetchResult }>} */
	const texts = new Map();
	for (const l of listed.links.filter((l) => /^議案第\d+号([〜～~]\d+号)?\(条例\)/.test(key(l.text)))) {
		const pdf = await get(l.href);
		const text = await pdfText(pdf.body);
		// A scanned bundle (令和8年3月's 20 MB 条例 bundle) has no text layer: its bills are title-only.
		if (key(text).length < 500) warnings.push(`${key(l.text).replace(/\[PDF.*$/, '')}: scanned, no text layer`);
		for (const [n, t] of splitBundle(text, '議案')) texts.set(n, { text: t, source: pdf });
	}

	const numbers = new Set([
		...[...results.keys()].map((k) => k.match(/^議案第(\d+)号$/)?.[1]).filter(Boolean).map(Number),
		...texts.keys()
	]);
	for (const n of [...numbers].sort((a, b) => a - b)) {
		const label = `議案第${n}号`;
		const r = results.get(label);
		const t = texts.get(n);
		// The bundle's second line is the title (「…条例について」), with any ruby lines dropped.
		const title = r?.title ?? (t ? key(dropRuby(t.text.split('\n').map((l) => l.trim())).slice(1, 3).join('')).match(/^.+?について/)?.[0] : undefined);
		if (!title) {
			warnings.push(`${label}: no title found, skipped`);
			continue;
		}
		if (!inScope(title)) continue;
		if (!t) warnings.push(`${label}: no text in the 条例 bundles, title-only`);
		const out = outcome(r?.result ?? '', r?.committee ?? null, t ? submittedDate(t.text) : null, r?.voteDate ?? null, {
			committeeUnknown: !r || (r.referred && !r.committee)
		});
		if (!out) {
			warnings.push(`${label}: unrecognised result 「${r?.result}」, skipped`);
			continue;
		}
		bills.push({
			facts: {
				id: billId(assembly.id, s, n, 'head'),
				assembly: assembly.id,
				number: label,
				official: title,
				by: 'head',
				session: session.name,
				committee: r?.committee ?? null,
				...out,
				...(t ? {} : { titleOnly: true }),
				sources: [
					...(t ? [{ label: `${label}（PDF）`, url: t.source.url, fetchedAt: t.source.fetchedAt }] : []),
					...(resultsPdf ? [{ label: `${session.name} 審議結果`, url: resultsPdf.url, fetchedAt: resultsPdf.fetchedAt }] : [])
				]
			},
			input: t ? `【議案本文】\n${t.text}\n` : ''
		});
	}

	// Member bills: a PDF each, or one for a range (「議提議案第1号〜4号」).
	/** @type {Map<string, Map<number, string>>} */
	const memberPdfs = new Map();
	const memberText = async (/** @type {number} */ n) => {
		const link = listed.links.find((l) => {
			const r = key(l.text).match(/^議提議案第(\d+)号(?:[〜~]第?(\d+)号)?/);
			return r && Number(r[1]) <= n && n <= Number(r[2] ?? r[1]);
		});
		if (!link) return null;
		const pdf = await get(link.href);
		if (!memberPdfs.has(pdf.url)) memberPdfs.set(pdf.url, splitBundle(await pdfText(pdf.body), '議提議案'));
		return { pdf, text: memberPdfs.get(pdf.url)?.get(n) ?? '' };
	};
	for (const [label, r] of results) {
		const m = label.match(/^(議提議案|委員会提出議案)第(\d+)号$/);
		if (!m || !inScope(r.title)) continue;
		if (m[1] === '委員会提出議案') {
			warnings.push(`${label} (committee bill) skipped: not supported yet`);
			continue;
		}
		const n = Number(m[2]);
		const found = await memberText(n);
		const pdf = found?.text ? found.pdf : null;
		const text = found?.text ?? '';
		if (!pdf) warnings.push(`${label}: no text found, title-only`);
		const out = outcome(r.result, r.committee, text ? submittedDate(text) : null, r.voteDate, { committeeUnknown: r.referred && !r.committee });
		if (!out) {
			warnings.push(`${label}: unrecognised result 「${r.result}」, skipped`);
			continue;
		}
		bills.push({
			facts: {
				id: billId(assembly.id, s, n, 'member'),
				assembly: assembly.id,
				number: label,
				official: r.title,
				by: 'member',
				session: session.name,
				committee: r.committee,
				...out,
				...(text ? {} : { titleOnly: true }),
				sources: [
					...(pdf ? [{ label: `${label}（PDF）`, url: pdf.url, fetchedAt: pdf.fetchedAt }] : []),
					...(resultsPdf ? [{ label: `${session.name} 審議結果`, url: resultsPdf.url, fetchedAt: resultsPdf.fetchedAt }] : [])
				]
			},
			input: text ? `【議案本文】\n${text}\n` : ''
		});
	}
	return { bills, warnings };
}
