// Builds src/lib/config/municipalities.json (the home page region search) from 総務省's
// 全国地方公共団体コード list: https://www.soumu.go.jp/denshijiti/code.html (the Excel file).
// Sheet 1 has every 市町村 and the 23 特別区; we keep those in SEARCH_PREFECTURES (config/site.js). The
// wards of designated cities are on sheet 2 and left out, since they have no assembly of their own. Rerun when municipalities merge or are renamed.
// Usage: download the Excel file by hand, then node scripts/municipalities.js <file.xlsx>
// Credit (公共データ利用規約 1.0): shown on the About page.

import { readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import * as cheerio from 'cheerio';
import { SEARCH_PREFECTURES } from '../src/lib/config/site.js';

/** Minimal zip reader: an .xlsx is a zip of XML files. */
function unzip(/** @type {Buffer} */ buf) {
	const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
	const count = buf.readUInt16LE(eocd + 10);
	let p = buf.readUInt32LE(eocd + 16);
	/** @type {Map<string, string>} */
	const files = new Map();
	for (let i = 0; i < count; i++) {
		const method = buf.readUInt16LE(p + 10);
		const size = buf.readUInt32LE(p + 20);
		const nameLen = buf.readUInt16LE(p + 28);
		const skip = nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
		const local = buf.readUInt32LE(p + 42);
		const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
		const data = buf.subarray(start, start + size);
		files.set(buf.toString('utf8', p + 46, p + 46 + nameLen), (method === 8 ? inflateRawSync(data) : data).toString('utf8'));
		p += 46 + skip;
	}
	return files;
}

const file = process.argv[2];
if (!file) throw new Error('usage: node scripts/municipalities.js <file.xlsx>');
const files = unzip(readFileSync(file));

// Shared strings, without the phonetic (rPh) annotations Excel stores alongside them.
const $s = cheerio.load(files.get('xl/sharedStrings.xml') ?? '', { xml: true });
const strings = $s('si')
	.toArray()
	.map((si) => $s(si).children('t').text() + $s(si).children('r').children('t').text());

const $ = cheerio.load(files.get('xl/worksheets/sheet1.xml') ?? '', { xml: true });
const hiragana = (/** @type {string} */ s) =>
	s.normalize('NFKC').replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

// 北方領土の6村 have codes but no working assembly (色丹村 … 蘂取村; the other 泊村 is 014036).
const NO_ASSEMBLY = new Set(['016951', '016969', '016977', '016985', '016993', '017001']);

/** @type {[string, string, string][]} [prefecture, name, kana] */
const rows = [];
for (const row of $('row').toArray()) {
	/** @type {Record<string, string>} */
	const cells = {};
	for (const c of $(row).children('c').toArray()) {
		const v = $(c).children('v').text();
		cells[($(c).attr('r') ?? '').replace(/\d+/g, '')] = $(c).attr('t') === 's' ? strings[Number(v)] : v;
	}
	// A code, B prefecture, C municipality (empty on prefecture rows), E municipality kana
	if (!/^\d{6}$/.test(cells.A ?? '') || !cells.C || NO_ASSEMBLY.has(cells.A)) continue;
	if (!SEARCH_PREFECTURES.includes(cells.B.trim())) continue;
	rows.push([cells.B.trim(), cells.C.trim(), hiragana(cells.E.trim())]);
}

writeFileSync('src/lib/config/municipalities.json', '[\n' + rows.map((r) => '\t' + JSON.stringify(r)).join(',\n') + '\n]\n');
console.log(`${rows.length} municipalities in ${SEARCH_PREFECTURES.length} prefectures (${rows.filter(([, n]) => n.endsWith('区')).length} special wards)`);
