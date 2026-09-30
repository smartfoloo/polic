// Covered assemblies: Tokyo, then wards in 団体コード order. Ids match the design's REGIONS keys.
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
 * @property {string} head who proposes most bills, for 「知事の提案」
 * @property {string} headEn
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
		head: '知事',
		headEn: 'Governor',
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
		id: 'tokyo/minato',
		name: '港区議会',
		nameEn: 'Minato City Assembly',
		place: '港区',
		placeEn: 'Minato',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['gikai2.city.minato.tokyo.jp'],
		listPages: [{ label: '議案一覧', url: 'https://gikai2.city.minato.tokyo.jp/g07_giketsu.asp?Sflg=2' }],
		// Source: session dropdown on the 議案一覧 page (g07 bill database), checked 2026-09-30
		// 2027 統一地方選挙 (April; assembly term ends 2027-04-30): fill in when the dates are announced.
		election: null,
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-18', closes: '2026-03-18' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-16', closes: '2026-06-25' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-10', closes: '2026-10-09' }
		]
	},
	{
		id: 'tokyo/taito',
		name: '台東区議会',
		nameEn: 'Taito City Assembly',
		place: '台東区',
		placeEn: 'Taito',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.taito.lg.jp'],
		// One index per calendar year: add the next year's in January.
		listPages: [{ label: '令和8年 本会議情報', url: 'https://www.city.taito.lg.jp/kugikai/kaigi/honkaigi/r8/index.html' }],
		// Source: the 会期 row of each session's 会議結果 page, checked 2026-09-30
		// 2027 統一地方選挙 (April): fill in when the dates are announced.
		election: null,
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-06', closes: '2026-03-26' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-02', closes: '2026-06-25' },
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-07-14', closes: '2026-07-14' },
			{ name: '令和8年第2回臨時会', nameEn: '2nd Extraordinary Session 2026', opened: '2026-07-24', closes: '2026-07-24' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-08', closes: '2026-10-27' }
		]
	},
	{
		id: 'tokyo/sumida',
		name: '墨田区議会',
		nameEn: 'Sumida City Assembly',
		place: '墨田区',
		placeEn: 'Sumida',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.sumida.lg.jp'],
		// One index per fiscal year (the session runs April to March): add the next year's in April.
		listPages: [
			{ label: '令和8年度 議案等', url: 'https://www.city.sumida.lg.jp/kugikai/kaigi_info/teireikai/2026/index.html' },
			{ label: '令和7年度 議案等', url: 'https://www.city.sumida.lg.jp/kugikai/kaigi_info/teireikai/2025/index.html' }
		],
		// Source: 会議日程 (/kugikai/kaigi_info/nittei/r8nittei.html, R7.html), checked 2026-09-30. A year-long
		// session: each 「…月議会」 is listed as a session, first to last plenary day. The 招集議会 (May) has no ordinances.
		// 2027 統一地方選挙 (April): fill in when the dates are announced.
		election: null,
		sessions: [
			{ name: '令和7年度定例会2月議会', nameEn: 'February Meeting 2026', opened: '2026-02-04', closes: '2026-03-31' },
			{ name: '令和8年度定例会6月議会', nameEn: 'June Meeting 2026', opened: '2026-06-12', closes: '2026-06-30' },
			{ name: '令和8年度定例会9月議会', nameEn: 'September Meeting 2026', opened: '2026-09-08', closes: '2026-09-29' }
		]
	},
	{
		id: 'tokyo/shinagawa',
		name: '品川区議会',
		nameEn: 'Shinagawa City Assembly',
		place: '品川区',
		placeEn: 'Shinagawa',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['gikai.city.shinagawa.tokyo.jp'],
		// The session list, then the current committee pages (which bills each committee reviewed).
		listPages: [
			{ label: '本会議の予定・結果', url: 'https://gikai.city.shinagawa.tokyo.jp/katsudou/honkaigi-schedule' },
			{ label: '総務委員会', url: 'https://gikai.city.shinagawa.tokyo.jp/katsudou/inkai-schedule/soumu' },
			{ label: '区民委員会', url: 'https://gikai.city.shinagawa.tokyo.jp/katsudou/inkai-schedule/kumin' },
			{ label: '厚生委員会', url: 'https://gikai.city.shinagawa.tokyo.jp/katsudou/inkai-schedule/kosei' },
			{ label: '建設委員会', url: 'https://gikai.city.shinagawa.tokyo.jp/katsudou/inkai-schedule/kensetsu' },
			{ label: '文教委員会', url: 'https://gikai.city.shinagawa.tokyo.jp/katsudou/inkai-schedule/bunkyo' },
			{ label: 'SDGs推進・行財政改革特別委員会', url: 'https://gikai.city.shinagawa.tokyo.jp/katsudou/inkai-schedule/sdgs' },
			{ label: '子ども若者支援・共生社会推進特別委員会', url: 'https://gikai.city.shinagawa.tokyo.jp/katsudou/inkai-schedule/kyosei' },
			{ label: 'まちづくり・公共交通推進特別委員会', url: 'https://gikai.city.shinagawa.tokyo.jp/katsudou/inkai-schedule/koukyo' }
		],
		// Source: 区議会の日程 (/schedule/19759, 20075, 20051, 20551.html), checked 2026-09-30; opened = first plenary day
		// 2027 統一地方選挙 (April): fill in when the dates are announced. The 区長選挙 on 2026-11-15 isn't an
		// assembly election, so it doesn't set this.
		election: null,
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-18', closes: '2026-03-27' },
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-05-27', closes: '2026-05-27' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-25', closes: '2026-07-09' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-17', closes: '2026-10-23' }
		]
	},
	{
		id: 'tokyo/setagaya',
		name: '世田谷区議会',
		nameEn: 'Setagaya City Assembly',
		place: '世田谷区',
		placeEn: 'Setagaya',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.setagaya.lg.jp'],
		listPages: [
			{ label: '議案・委員会資料', url: 'https://www.city.setagaya.lg.jp/02252/5631.html' },
			{ label: '定例会・臨時会の結果', url: 'https://www.city.setagaya.lg.jp/gikai/teirei/11604.html' },
			{ label: '世田谷区議会', url: 'https://www.city.setagaya.lg.jp/gikai/index.html' }
		],
		// Source: /gikai/teirei/11604.html (closed sessions) and /02030/18875.html (the current one), checked 2026-09-30
		// 2027 統一地方選挙 (April): fill in when the dates are announced.
		election: null,
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-18', closes: '2026-03-27' },
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-05-14', closes: '2026-05-20' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-10', closes: '2026-06-19' },
			{ name: '令和8年第2回臨時会', nameEn: '2nd Extraordinary Session 2026', opened: '2026-07-06', closes: '2026-07-06' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-15', closes: '2026-10-20' }
		]
	},
	{
		id: 'tokyo/shibuya',
		name: '渋谷区議会',
		nameEn: 'Shibuya City Assembly',
		place: '渋谷区',
		placeEn: 'Shibuya',
		head: '区長',
		headEn: 'Mayor',
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
		id: 'tokyo/nakano',
		name: '中野区議会',
		nameEn: 'Nakano City Assembly',
		place: '中野区',
		placeEn: 'Nakano',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['kugikai-nakano.jp'],
		// One 議案一覧 page per calendar year: add the next year's in January.
		listPages: [{ label: '令和8年 議案一覧', url: 'https://kugikai-nakano.jp/honkaigi.html?nen=2026' }],
		// Source: 議会日程 (nittei.html, monthly), first to last plenary day, checked 2026-09-30
		// 2027 統一地方選挙 (April): fill in when the dates are announced.
		election: null,
		sessions: [
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-01-22', closes: '2026-01-22' },
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-09', closes: '2026-03-23' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-29', closes: '2026-07-16' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-07', closes: '2026-10-16' }
		]
	},
	{
		id: 'tokyo/suginami',
		name: '杉並区議会',
		nameEn: 'Suginami City Assembly',
		place: '杉並区',
		placeEn: 'Suginami',
		head: '区長',
		headEn: 'Mayor',
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
	},
	{
		id: 'tokyo/adachi',
		name: '足立区議会',
		nameEn: 'Adachi City Assembly',
		place: '足立区',
		placeEn: 'Adachi',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.gikai-adachi.jp'],
		listPages: [{ label: '議案一覧', url: 'https://www.gikai-adachi.jp/g07_giketsu.asp?Sflg=2' }],
		// Source: session dropdown on the 議案の検索 page (g07 bill database), checked 2026-09-30
		// Not in the April unified election: the assembly term ends 2027-05-25, so the election is around May 2027.
		election: null,
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-19', closes: '2026-03-24' },
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-06-05', closes: '2026-06-05' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-22', closes: '2026-07-07' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-14', closes: '2026-10-20' }
		]
	},
	{
		id: 'tokyo/katsushika',
		name: '葛飾区議会',
		nameEn: 'Katsushika City Assembly',
		place: '葛飾区',
		placeEn: 'Katsushika',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.katsushika-kugikai.jp'],
		// Order matters to the adapter: 議案一覧・付託表, 議決結果・賛否一覧, 議案 (PDFs).
		listPages: [
			{ label: '議案一覧・付託表', url: 'https://www.katsushika-kugikai.jp/30100.html' },
			{ label: '議決結果・賛否一覧', url: 'https://www.katsushika-kugikai.jp/30200.html' },
			{ label: '議案', url: 'https://www.katsushika-kugikai.jp/60400.html' }
		],
		// Source: 令和8年度 議会予定表 (schedule.pdf/R8schedule.pdf) and 開催予定 (20301.html), checked 2026-09-30.
		// 第1回's schedule (R7schedule.pdf) is a scanned image: 2026-02-16 is its first recorded plenary vote, not a
		// confirmed opening day. Assembly election: November 2029 (the last was November 2025).
		election: null,
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-16', closes: '2026-03-27' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-04', closes: '2026-06-22' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-15', closes: '2026-10-15' }
		]
	},
	{
		id: 'tokyo/edogawa',
		name: '江戸川区議会',
		nameEn: 'Edogawa City Assembly',
		place: '江戸川区',
		placeEn: 'Edogawa',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.gikai.city.edogawa.tokyo.jp'],
		listPages: [{ label: '議案一覧', url: 'https://www.gikai.city.edogawa.tokyo.jp/g07_giketsu.asp?Sflg=2' }],
		// Source: session dropdown on the 議案一覧 page (g07 bill database), checked 2026-09-30
		// 2027 統一地方選挙 (April; assembly term ends 2027-05-01): fill in when the dates are announced.
		election: null,
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-17', closes: '2026-03-25' },
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-05-28', closes: '2026-06-01' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-12', closes: '2026-07-01' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-24', closes: '2026-10-30' }
		]
	}
];

export const allHosts = assemblies.flatMap((a) => a.hosts);
