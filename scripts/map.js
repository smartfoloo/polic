// Builds src/lib/map/kanto.json, the home page map, from 国土数値情報 行政区域データ (N03, MLIT, CC BY 4.0).
// One-off: download the seven Kanto files (N03-20260101_08 … _14_GML.zip) from
// https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html, unzip them into cache/map/, then
// `node scripts/map.js`. mapshaper runs through npx so it isn't a project dependency.
//
// Kept: every municipality in config/municipalities.json for the seven prefectures (政令市 wards merged
// into their city), plus mainland 所属未定地 (reclaimed land in Tokyo Bay) as unclickable land. Dropped: the
// Tokyo islands (伊豆諸島・小笠原, codes 13360+) and specks under 0.05 km². Fails unless every listed
// municipality ends up with exactly one shape.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const PREFS = ['08', '09', '10', '11', '12', '13', '14'];
const OUT = 'src/lib/map/kanto.json';
const TMP = 'cache/map/out';
// 平面直角座標系 IX (JGD2011), the national grid zone for Tokyo and most of Kanto: true shapes, metres.
const PROJ = '+proj=tmerc +lat_0=36 +lon_0=139.8333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m';
const UNIT = 100; // output coordinates in 100 m

const inputs = PREFS.map((c) => `cache/map/N03-20260101_${c}_GML/N03-20260101_${c}.geojson`);
const mapshaper = (/** @type {string[]} */ args) => execFileSync('npx', ['-y', 'mapshaper@0.7.76', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });

mkdirSync(TMP, { recursive: true });
mapshaper([
	'-i', ...inputs, 'combine-files',
	'-merge-layers', 'force',
	'-filter', '!(N03_001 === "東京都" && +N03_007 >= 13360)',
	'-filter', '!(N03_004 === "所属未定地" && this.centroidY < 34.9)',
	'-each', 'key = N03_004 === "所属未定地" ? "" : N03_001 + "/" + N03_004, pref = N03_001',
	'-dissolve2', 'key', 'copy-fields=pref',
	'-proj', PROJ,
	'-filter-islands', 'min-area=50000', 'remove-empty',
	'-simplify', 'weighted', 'interval=150', 'keep-shapes',
	'-clean',
	'-rename-layers', 'muni',
	'-dissolve', 'pref', '+', 'name=prefs',
	'-o', TMP + '/', 'target=*', 'format=geojson', 'force'
]);

/** @typedef {{ features: { properties: { key: string, pref: string }, geometry: { type: string, coordinates: any } }[] }} Layer */
const geo = /** @type {Layer} */ (JSON.parse(readFileSync(`${TMP}/muni.json`, 'utf8')));
const prefs = /** @type {Layer} */ (JSON.parse(readFileSync(`${TMP}/prefs.json`, 'utf8')));

const r = (/** @type {number} */ v) => Math.round(v / UNIT);
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const f of geo.features) {
	const walk = (/** @type {any} */ c) => {
		if (typeof c[0] === 'number') {
			minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]);
			minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]);
		} else c.forEach(walk);
	};
	walk(f.geometry.coordinates);
}
const x0 = r(minX), y1 = r(maxY);

/** One SVG path for a (multi)polygon; y flipped so north is up. */
function pathOf(/** @type {{ type: string, coordinates: any }} */ g) {
	const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
	return polys
		.flatMap((/** @type {number[][][]} */ rings) =>
			rings.map((ring) => {
				const pts = ring.slice(0, -1).map(([x, y]) => [r(x) - x0, y1 - r(y)]);
				const dedup = pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
				if (dedup.length < 3) return '';
				// Relative moves after the first point: small numbers keep the file small.
				const rel = dedup.slice(1).map((p, i) => `${p[0] - dedup[i][0]} ${p[1] - dedup[i][1]}`);
				return `M${dedup[0][0]} ${dedup[0][1]}l${rel.join(' ')}z`;
			})
		)
		.join('');
}

const municipalities = /** @type {[string, string, string][]} */ (JSON.parse(readFileSync('src/lib/config/municipalities.json', 'utf8')));
const PREF_NAMES = ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'];
// The islands dropped above (codes 13360+), by name since municipalities.json has no codes.
const ISLANDS = ['大島町', '利島村', '新島村', '神津島村', '三宅村', '御蔵島村', '八丈町', '青ヶ島村', '小笠原村'].map((n) => `東京都/${n}`);
const wanted = municipalities.filter(([p]) => PREF_NAMES.includes(p)).map(([p, n]) => `${p}/${n}`).filter((k) => !ISLANDS.includes(k));

const shapes = geo.features.map((f) => ({ key: f.properties.key, pref: f.properties.pref, d: pathOf(f.geometry) }));
const byKey = new Map();
for (const s of shapes) if (s.key) byKey.set(s.key, (byKey.get(s.key) ?? 0) + 1);
const missing = wanted.filter((k) => byKey.get(k) !== 1);
const extra = [...byKey.keys()].filter((k) => !wanted.includes(k));
if (missing.length || extra.length) {
	console.error('Shape check failed', { missing, extra });
	process.exit(1);
}

// Frame for the zoomed-in Tokyo view, in output units, with a 4 km margin.
let t = [Infinity, Infinity, -Infinity, -Infinity];
for (const f of geo.features.filter((f) => f.properties.pref === '東京都')) {
	const walk = (/** @type {any} */ c) => {
		if (typeof c[0] === 'number') t = [Math.min(t[0], c[0]), Math.min(t[1], c[1]), Math.max(t[2], c[0]), Math.max(t[3], c[1])];
		else c.forEach(walk);
	};
	walk(f.geometry.coordinates);
}
const M = 40;
const tokyo = [r(t[0]) - x0 - M, y1 - r(t[3]) - M, r(t[2]) - r(t[0]) + 2 * M, r(t[3]) - r(t[1]) + 2 * M];

const out = {
	source: '国土数値情報（行政区域データ、2026年1月1日時点）（国土交通省）',
	origin: [x0, y1], // grid position of the top-left corner, in UNIT
	width: r(maxX) - x0,
	height: y1 - r(minY),
	tokyo,
	shapes: shapes.map(({ key, pref, d }) => (key ? { pref, name: key.split('/')[1], d } : { pref, d })),
	prefs: prefs.features.map((f) => ({ pref: f.properties.pref, d: pathOf(f.geometry) }))
};
mkdirSync('src/lib/map', { recursive: true });
writeFileSync(OUT, JSON.stringify(out));
console.log(`${OUT}: ${wanted.length} municipalities, ${shapes.length - wanted.length} unassigned, ${out.width}×${out.height}, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
