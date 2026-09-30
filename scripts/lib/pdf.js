import { extractText, getDocumentProxy } from 'unpdf';
import { stripCjkSpaces } from './text.js';

/** @param {Buffer} body */
async function open(body) {
	// verbosity 0 silences font warnings; text still extracts without the CMap files.
	return getDocumentProxy(new Uint8Array(body), { verbosity: 0 });
}

/** @param {Buffer} body */
export async function pdfText(body) {
	const { text } = await extractText(await open(body), { mergePages: true });
	return stripCjkSpaces(joinVertical(text).replace(/[ \t]+/g, ' '));
}

// Vertically typeset documents (e.g. Minato's 議案) extract one character per line; join them back.
/** @param {string} text */
function joinVertical(text) {
	const lines = text.split('\n').filter((l) => l.trim());
	const single = lines.filter((l) => [...l.trim()].length === 1).length;
	return lines.length && single / lines.length > 0.6 ? text.replace(/\n/g, '') : text;
}

/**
 * Text items with page coordinates, for tables that plain extraction scrambles.
 * @param {Buffer} body
 * @returns {Promise<{ page: number, x: number, y: number, str: string }[]>}
 */
export async function pdfItems(body) {
	const pdf = await open(body);
	const items = [];
	for (let p = 1; p <= pdf.numPages; p++) {
		const { items: raw } = await (await pdf.getPage(p)).getTextContent();
		for (const i of raw) {
			if ('str' in i && i.str.trim()) items.push({ page: p, x: i.transform[4], y: i.transform[5], str: i.str });
		}
	}
	return items;
}
