// Japanese is the default; English pages live under /en/. UI strings are written inline as
// t('日本語', 'English') pairs. Fixed terms (status, stage, committee, topic) come from the glossaries
// below and src/lib/config, never from the LLM.

import { page } from '$app/state';
import { categories } from './config/categories.js';
import { committeeEn } from './config/committees.js';

export const isEn = () => page.params.lang === 'en';

/** @param {string} ja @param {string} en */
export const t = (ja, en) => (isEn() ? en : ja);

/** Site path in the current language: href('/tokyo') → '/en/tokyo' on English pages. */
export const href = (/** @type {string} */ path) => (isEn() ? (path === '/' ? '/en' : '/en' + path) : path);

/** The same page in the other language. */
export function otherLangPath(/** @type {string} */ pathname) {
	if (pathname === '/en' || pathname.startsWith('/en/')) return pathname.slice(3) || '/';
	return pathname === '/' ? '/en' : '/en' + pathname;
}

const STATUS_EN = { 提案中: 'Proposed', 審議中: 'Under review', 決定: 'Passed', 否決: 'Rejected' };
export const STATUS_CLASS = { 提案中: 's-pending', 審議中: 's-active', 決定: 's-passed', 否決: 's-rejected' };
export const statusLabel = (/** @type {string} */ s) => t(s, STATUS_EN[/** @type {keyof STATUS_EN} */ (s)] ?? s);

export const categoryLabel = (/** @type {string} */ c) => t(c, categories.find((x) => x.ja === c)?.en ?? c);
export const categoryEmoji = (/** @type {string} */ c) => categories.find((x) => x.ja === c)?.emoji ?? '📄';
export const committeeLabel = (/** @type {string} */ c) => t(c, committeeEn[c] ?? c);

const DATE_KIND_EN = { 提案: 'Proposed', 可決: 'Passed', 否決: 'Rejected' };
export const dateKindLabel = (/** @type {string} */ k) => t(k, DATE_KIND_EN[/** @type {keyof DATE_KIND_EN} */ (k)] ?? k);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** '2026-06-12' → 2026年6月12日 / June 12, 2026 */
export function fmtDate(/** @type {string} */ iso) {
	const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
	return t(`${y}年${m}月${d}日`, `${MONTHS[m - 1]} ${d}, ${y}`);
}

/** Board notes for what an assembly's source doesn't publish (config/assemblies.js `gaps`). Same wording everywhere. */
const GAP_NOTES = {
	afterClose: ['議案は会期が終わってから掲載されます。', 'Bills are listed only after the session ends.'],
	resultsAfterClose: ['結果は会期が終わってから反映されます。', 'Results are added only after the session ends.'],
	voteDate: ['採決日は公表されていません。日付は提出日です。', "Vote dates aren't published. Dates shown are submission dates."],
	committee: ['付託された委員会は公表されていません。', "The committee each bill goes to isn't published."],
	scanned: ['議案の本文が画像のため、題名と結果だけを載せています。', 'Bill texts are published as images, so only titles and results are shown.']
};
export const gapNote = (/** @type {import('./config/assemblies.js').Gap} */ g) => t(GAP_NOTES[g][0], GAP_NOTES[g][1]);
