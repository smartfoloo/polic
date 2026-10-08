// 羽村市議会. The 令和8年市長提出議案 page has a table per session, captioned 「第3回定例会」: 番号 (「第63号」) |
// 件名 | 要旨 (the reason, 【主な内容】 and 【施行日】) | 結果 (「9月9日原案可決」). The 要旨 is the only text
// published; there are no bill PDFs. Committees come from the session's 議事日程 page, whose rows say
// 「委員会付託(総務委員会）」. Member bills are on a separate page, not collected yet.

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
	const [billsPage, agendaIndex] = assembly.listPages;
	const reiwa = `令和${s.year - 2018}年`;

	const page = await get(billsPage.url);
	const $ = loadHtml(page.body, page.contentType);
	const table = $('table')
		.toArray()
		.find((t) => reiwa + key($(t).find('caption').text()) === key(session.name) && key($(t).find('tr').first().text()).startsWith('番号'));
	if (!table) return { bills, warnings: [`No table for ${session.name} on ${page.url}`] };

	// Committee per bill from the 議事日程 page (「令和8年（2026年）第3回羽村市議会定例会議事日程」).
	/** @type {Map<number, string>} */
	const committees = new Map();
	const ai = await get(agendaIndex.url);
	const [agendaLink] = findLinks(loadHtml(ai.body, ai.contentType), ai.url, (t) => key(t).replace(/\(\d{4}年\)|羽村市議会/g, '') === key(`${session.name}議事日程`));
	if (agendaLink) {
		const agenda = await get(agendaLink.href);
		const $a = loadHtml(agenda.body, agenda.contentType);
		for (const tr of $a('tr').toArray()) {
			const text = key($a(tr).text());
			const m = text.match(/議案第(\d+)号.*委員会付託\((.+?委員会)\)/);
			if (m) committees.set(Number(m[1]), m[2]);
		}
	} else warnings.push(`No 議事日程 for ${session.name} on ${ai.url}: committees unknown`);

	for (const tr of $(table).find('tr').toArray().slice(1)) {
		const tds = $(tr).children('td, th').toArray().map((td) => $(td));
		if (tds.length < 4) continue;
		const m = key(tds[0].text()).match(/^第(\d+)号$/);
		const official = squash(tds[1].text());
		if (!m || !inScope(official)) continue;
		const n = Number(m[1]);
		const label = `議案第${n}号`;
		const result = key(tds[3].text());
		const d = result.match(/^(\d+)月(\d+)日/);
		const voteDate = d ? `${s.year}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}` : null;
		const committee = committees.get(n) ?? null;
		const content = squash(tds[2].text());

		const out = outcome(result.replace(/^\d+月\d+日/, ''), committee, null, voteDate);
		if (!out) {
			warnings.push(`${label}: unrecognised result 「${result}」, skipped`);
			continue;
		}
		bills.push({
			facts: {
				id: billId(assembly.id, s, n, 'head'),
				assembly: assembly.id,
				number: label,
				official,
				by: 'head',
				session: session.name,
				committee,
				...out,
				...(content ? {} : { titleOnly: true }),
				sources: [{ label: `${reiwa}市長提出議案`, url: page.url, fetchedAt: page.fetchedAt }]
			},
			input: content ? `【要旨】\n${content}\n` : ''
		});
	}
	return { bills, warnings };
}
