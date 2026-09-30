import * as cheerio from 'cheerio';
import { squash } from './text.js';

// Some assembly sites (the g07 bill database) still serve Shift_JIS.
const SJIS = /^(shift_jis|shift-jis|sjis|x-sjis|windows-31j|cp932|ms932)$/i;

/** Decodes by the charset in the Content-Type header or the page's meta tag; UTF-8 otherwise. */
export function decodeHtml(/** @type {Buffer} */ body, contentType = '') {
	const declared = contentType.match(/charset=([\w-]+)/i)?.[1] ?? body.subarray(0, 2048).toString('latin1').match(/charset=["']?([\w-]+)/i)?.[1] ?? '';
	const charset = SJIS.test(declared) ? 'shift_jis' : /^euc-jp$/i.test(declared) ? 'euc-jp' : 'utf-8';
	return new TextDecoder(charset).decode(body);
}

/**
 * @param {Buffer} body
 * @param {string} [contentType] the response header, for its charset
 */
export function loadHtml(body, contentType) {
	return cheerio.load(decodeHtml(body, contentType));
}

/**
 * Absolute URLs of links whose text matches, in page order.
 * @param {cheerio.CheerioAPI} $
 * @param {string} base
 * @param {(text: string, href: string) => boolean} match
 */
export function findLinks($, base, match) {
	return $('a[href]')
		.toArray()
		.map((a) => ({ text: squash($(a).text()), href: new URL(/** @type {string} */ ($(a).attr('href')), base).href }))
		.filter((l) => match(l.text, l.href));
}

/**
 * Rows of a table as trimmed cell texts, plus the first link in each cell.
 * @param {cheerio.CheerioAPI} $
 * @param {any} table
 * @param {string} base
 */
export function tableRows($, table, base) {
	return $(table)
		.find('tr')
		.toArray()
		.map((tr) =>
			$(tr)
				.children('td, th')
				.toArray()
				.map((c) => {
					const href = $(c).find('a[href]').attr('href');
					return { text: squash($(c).text()), href: href ? new URL(href, base).href : null };
				})
		);
}

/**
 * A table as a grid of trimmed cell texts, with rowspan/colspan cells repeated into every row and
 * column they cover (so a result shared by two bills appears on both rows).
 * @param {cheerio.CheerioAPI} $
 * @param {any} table
 */
export function tableGrid($, table) {
	/** @type {string[][]} */
	const grid = [];
	$(table)
		.find('tr')
		.each((r, tr) => {
			grid[r] ??= [];
			let c = 0;
			for (const cell of $(tr).children('td, th').toArray()) {
				while (grid[r][c] !== undefined) c++;
				const text = squash($(cell).text());
				const rows = Number($(cell).attr('rowspan') ?? 1);
				const cols = Number($(cell).attr('colspan') ?? 1);
				for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) (grid[r + i] ??= [])[c + j] = text;
				c += cols;
			}
		});
	return grid;
}
