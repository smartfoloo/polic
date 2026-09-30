// Region search for the home page. Every prefecture is searchable; a region is "covered" when it has an
// assembly in config/assemblies.js. Municipalities come from config/municipalities.json as
// [prefecture, name, kana], built from 総務省's code list by scripts/municipalities.js (市町村 and 特別区
// in SEARCH_PREFECTURES, no designated-city wards).

import { prefectures } from './config/prefectures.js';
import { SEARCH_PREFECTURES } from './config/site.js';

/**
 * @typedef {object} Region
 * @property {string} name 東京都 / 渋谷区
 * @property {string} nameEn English page label; the Japanese name where there is no English one
 * @property {string} pref prefecture name, '' for a prefecture itself
 * @property {string} kana hiragana reading
 * @property {string} [assembly] assembly id when covered
 */

const toHiragana = (/** @type {string} */ s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

export const normRegionQuery = (/** @type {string} */ q) => toHiragana(q.normalize('NFKC').toLowerCase().replace(/\s+/g, ''));

/**
 * @param {import('./bills.js').PublicAssembly[]} assemblies
 * @param {[string, string, string][]} municipalities
 * @returns {Region[]}
 */
export function buildRegions(assemblies, municipalities) {
	const prefOf = (/** @type {import('./bills.js').PublicAssembly} */ a) => assemblies.find((p) => p.id === a.parent)?.place ?? '';

	/** @type {Region[]} */
	const prefs = prefectures.filter(([name]) => SEARCH_PREFECTURES.includes(name)).map(([name, kana, en]) => {
		const a = assemblies.find((x) => x.level === 'pref' && x.place === name);
		return { name, nameEn: a?.placeEn ?? en, pref: '', kana, assembly: a?.id };
	});

	const munis = municipalities.map(([pref, name, kana]) => {
		const a = assemblies.find((x) => x.level === 'muni' && x.place === name && prefOf(x) === pref);
		return { name, nameEn: a?.placeEn ?? name, pref, kana, assembly: a?.id };
	});

	return [...prefs, ...munis];
}

/** Text a query is compared against: name, reading, prefecture + name, and the English name. */
function keys(/** @type {Region} */ r) {
	return [r.name, r.kana, r.pref + r.name, r.pref ? '' : r.nameEn.toLowerCase()].filter(Boolean).map(normRegionQuery);
}

/** Prefix matches first, then covered regions, then anywhere-in-text matches. */
export function searchRegions(/** @type {Region[]} */ regions, /** @type {string} */ q, limit = 8) {
	const nq = normRegionQuery(q);
	if (!nq) return [];
	return regions
		.map((r) => {
			const ks = keys(r);
			const rank = ks.some((k) => k.startsWith(nq)) ? 0 : ks.some((k) => k.includes(nq)) ? 1 : 2;
			return { r, rank };
		})
		.filter((x) => x.rank < 2)
		.sort((a, b) => a.rank - b.rank || Number(!!b.r.assembly) - Number(!!a.r.assembly))
		.slice(0, limit)
		.map((x) => x.r);
}
