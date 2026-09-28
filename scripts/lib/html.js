import * as cheerio from 'cheerio';
import { squash } from './text.js';

/** @param {Buffer} body */
export function loadHtml(body) {
	return cheerio.load(body.toString('utf8'));
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
