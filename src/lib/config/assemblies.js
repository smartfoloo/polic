// Pilot assemblies. Ids match the design's REGIONS keys.
// Session dates are hardcoded from each assembly's own schedule pages (checked 2026-09-28);
// only verified sessions are listed. Add the next session when its dates are published.

/**
 * @typedef {object} Session
 * @property {string} name
 * @property {string} nameEn
 * @property {string} opened ISO date
 * @property {string} closes ISO date, scheduled or actual
 */

/**
 * @typedef {object} Assembly
 * @property {string} id
 * @property {string} name
 * @property {string} nameEn
 * @property {string} place
 * @property {string} placeEn
 * @property {'pref' | 'muni'} level
 * @property {string} [parent]
 * @property {string[]} hosts the fetcher refuses any other host
 * @property {{ label: string, url: string }[]} listPages entry points for the adapters
 * @property {Session[]} sessions
 * @property {{ notice: string, day: string } | null} election official notice date (告示日) through election day, ISO;
 *   no bill goes live without human review in this window. null when none is scheduled or dates aren't announced yet.
 */

/** @type {Assembly[]} */
export const assemblies = [
	{
		id: 'tokyo',
		name: '東京都議会',
		nameEn: 'Tokyo Metropolitan Assembly',
		place: '東京都',
		placeEn: 'Tokyo',
		level: 'pref',
		hosts: ['www.gikai.metro.tokyo.lg.jp', 'www.metro.tokyo.lg.jp'],
		listPages: [{ label: '提出議案と議決結果', url: 'https://www.gikai.metro.tokyo.lg.jp/bill/' }],
		// Source: /outline/archive-22.html and /schedule/plenary-session.html
		// Next metropolitan assembly election: 2029.
		election: null,
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-18', closes: '2026-03-27' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-09', closes: '2026-06-24' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-18', closes: '2026-10-08' }
		]
	},
	{
		id: 'tokyo/shibuya',
		name: '渋谷区議会',
		nameEn: 'Shibuya City Assembly',
		place: '渋谷区',
		placeEn: 'Shibuya',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['shibukugi.tokyo'],
		listPages: [
			{ label: '議案等について', url: 'https://shibukugi.tokyo/kaigi_oshirase/2023021400039/' },
			{ label: '議決の結果', url: 'https://shibukugi.tokyo/kaigi_kekka/2023020600027/' }
		],
		// Source: shibukugi.tokyo top-page notice
		// 2027 統一地方選挙 (April): fill in when the dates are announced.
		election: null,
		sessions: [
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-11', closes: '2026-10-15' }
		]
	},
	{
		id: 'tokyo/suginami',
		name: '杉並区議会',
		nameEn: 'Suginami City Assembly',
		place: '杉並区',
		placeEn: 'Suginami',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.suginami.tokyo.jp'],
		listPages: [
			{ label: '議案・議決結果の一覧', url: 'https://www.city.suginami.tokyo.jp/kugikai/kaigi/giangiketsu/index.html' }
		],
		// Source: /kugikai/kaigi/nittei/r08/ monthly schedules
		// 2027 統一地方選挙 (April): fill in when the dates are announced.
		election: null,
		sessions: [
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-05-22', closes: '2026-06-12' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-09', closes: '2026-10-19' }
		]
	}
];

export const allHosts = assemblies.flatMap((a) => a.hosts);
