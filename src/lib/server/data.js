// Reads data/ at build time (and live in dev, so review edits show up on reload).
// Only bills that publishState() lets through leave this module, stripped to the public fields.
// Assemblies with published: false (and their bills) don't leave it at all.

import { assemblies } from '$lib/config/assemblies.js';
import { toCard } from '$lib/bills.js';
import kanto from '$lib/map/kanto.json';
import { publishState } from '../../../scripts/lib/publish.js';
import { jaSource } from '../../../scripts/lib/prompts.js';

/** @typedef {import('$lib/bills.js').PublicBill} PublicBill */
/** @typedef {import('$lib/bills.js').PublicAssembly} PublicAssembly */

const files = import.meta.glob('/data/*/*.json', { eager: true, import: 'default' });
const popularFile = /** @type {{ visitors?: Record<string, number> } | undefined} */ (
	Object.values(import.meta.glob('/data/popular.json', { eager: true, import: 'default' }))[0]
);

/** Popular strip: unique visitors over the last 14 days needed to show a bill (PLAN.md). */
const POPULAR_MIN = 30;
const POPULAR_MAX = 5;

/** Build date in Japan: session states and the election window are as of the last build. */
export const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

const shown = assemblies.filter((a) => a.published !== false);
const shownIds = new Set(shown.map((a) => a.id));
const all = /** @type {any[]} */ (Object.values(files)).filter((b) => shownIds.has(b.assembly));

/** @returns {PublicBill} */
export function toPublic(/** @type {any} */ b) {
	// Unapproved English is shown too, labelled as an unchecked machine translation (REVIEW.md).
	const enCurrent = b.en && b.en.sourceHash === jaSource(b).hash;
	return {
		id: b.id,
		assembly: b.assembly,
		number: b.number,
		official: b.official,
		by: b.by,
		session: b.session,
		committee: b.committee,
		stage: b.stage,
		status: b.status,
		dateKind: b.dateKind,
		date: b.date,
		titleOnly: !!b.titleOnly,
		reviewed: !!b.approved,
		sources: b.sources.map((/** @type {any} */ s) => ({ label: s.label, url: s.url })),
		...(b.titleOnly ? {} : { name: b.name, category: b.category, summary: b.summary, changes: b.changes, who: b.who, why: b.why }),
		en: enCurrent
			? b.titleOnly
				? { reviewed: !!b.en.approved, official: b.en.official }
				: {
						reviewed: !!b.en.approved,
						name: b.en.name,
						official: b.en.official,
						summary: b.en.summary,
						changes: b.en.changes,
						who: b.en.who,
						why: b.en.why
					}
			: null
	};
}

const live = all.filter((b) => publishState(b, today) !== 'held').map(toPublic);

/** @returns {PublicAssembly} */
const toPublicAssembly = (/** @type {import('$lib/config/assemblies.js').Assembly} */ a) => ({
	id: a.id,
	name: a.name,
	nameEn: a.nameEn,
	place: a.place,
	placeEn: a.placeEn,
	head: a.head,
	headEn: a.headEn,
	level: a.level,
	parent: a.parent,
	sessions: a.sessions,
	gaps: a.gaps ?? []
});

export const publicAssemblies = shown.map(toPublicAssembly);

export const liveBills = (/** @type {string} */ assembly) => live.filter((b) => b.assembly === assembly);
export const allLiveBills = () => live;

/** How many bills are waiting for review, shown as a count only. */
export const heldCount = (/** @type {string} */ assembly) =>
	all.filter((b) => b.assembly === assembly && publishState(b, today) === 'held').length;

/** Bill ids for the 「よく見られている」 strip; empty (strip hidden) when none qualify or in an election window. */
export function popularIds(/** @type {string} */ assembly) {
	const election = assemblies.find((a) => a.id === assembly)?.election;
	if (election && election.notice <= today && today <= election.day) return [];
	const visitors = popularFile?.visitors ?? {};
	return liveBills(assembly)
		.filter((b) => (visitors[b.id] ?? 0) >= POPULAR_MIN)
		.sort((a, b) => visitors[b.id] - visitors[a.id])
		.slice(0, POPULAR_MAX)
		.map((b) => b.id);
}

/** The place's outline from the home page map, or null for places the map lacks. */
function shapeOf(/** @type {PublicAssembly} */ a) {
	if (a.level === 'pref') {
		const p = kanto.prefs.find((x) => x.pref === a.place);
		// Prefecture outlines carry no box, so it's the union of its municipalities' boxes.
		const boxes = kanto.shapes.filter((x) => x.pref === a.place).map((x) => x.box);
		if (!p || !boxes.length) return null;
		const [x0, y0] = [Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1]))];
		const [x1, y1] = [Math.max(...boxes.map((b) => b[0] + b[2])), Math.max(...boxes.map((b) => b[1] + b[3]))];
		return { d: p.d, box: [x0, y0, x1 - x0, y1 - y0] };
	}
	const pref = publicAssemblies.find((p) => p.id === a.parent)?.place;
	const s = a.level === 'muni' ? kanto.shapes.find((x) => x.pref === pref && x.name === a.place) : undefined;
	return s ? { d: s.d, box: s.box } : null;
}

/** Data for an assembly's board; the bill page adds the one bill. */
export function board(/** @type {string} */ assembly) {
	const a = /** @type {PublicAssembly} */ (publicAssemblies.find((p) => p.id === assembly));
	return {
		assembly: a,
		shape: shapeOf(a),
		cards: liveBills(assembly).map(toCard),
		held: heldCount(assembly),
		popular: popularIds(assembly)
	};
}
