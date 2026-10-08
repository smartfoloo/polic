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
 * @property {false} [published] false keeps the assembly collected and reviewable in admin but off the site:
 *   its results can't be tied to bills reliably (see PLAN.md, "Publishing bar"), it hasn't been collected yet,
 *   or it is in a prefecture the site doesn't show yet.
 * @property {Gap[]} [gaps] what the source doesn't publish, shown on the board (wording in src/lib/i18n.js)
 */

/**
 * afterClose: bills appear only once the session closes. resultsAfterClose: results appear only then.
 * voteDate: no vote dates, so dates are submission dates. committee: no committee per bill.
 * scanned: bill texts are images, so only titles and results are shown.
 * titleOnly: bill texts aren't published (or can't be read), so only titles and results are shown.
 * @typedef {'afterClose' | 'resultsAfterClose' | 'voteDate' | 'committee' | 'scanned' | 'titleOnly'} Gap
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
		id: 'tokyo/shinjuku',
		name: '新宿区議会',
		nameEn: 'Shinjuku City Assembly',
		place: '新宿区',
		placeEn: 'Shinjuku',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.shinjuku.lg.jp'],
		// The adapter reads these in this order.
		listPages: [
			{ label: '定例会・臨時会', url: 'https://www.city.shinjuku.lg.jp/kusei/file08_00015.html' },
			{ label: '区長提出議案', url: 'https://www.city.shinjuku.lg.jp/kusei/index_gian01.html' }
		],
		// Source: 会期 on each session's page, checked 2026-10-03.
		// 2027 統一地方選挙 (April): fill in when the dates are announced.
		election: null,
		published: false,
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-17', closes: '2026-03-24' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-10', closes: '2026-06-19' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-16', closes: '2026-10-15' }
		]
	},
	{
		id: 'tokyo/bunkyo',
		name: '文京区議会',
		nameEn: 'Bunkyo City Assembly',
		place: '文京区',
		placeEn: 'Bunkyo',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		// Not collected yet: the board would be empty.
		published: false,
		hosts: ['www.city.bunkyo.lg.jp'],
		listPages: [{ label: '議決結果', url: 'https://www.city.bunkyo.lg.jp/kugikai/p007042.html' }],
		// Source: the 会期 in each 議決結果 link and the 議会日程 page (p007907), checked 2026-10-07. A 11月定例議会
		// is also listed; add it when its dates are set.
		// 2027 統一地方選挙 (April): fill in when the dates are announced.
		election: null,
		gaps: ['afterClose', 'voteDate', 'committee', 'titleOnly'],
		sessions: [
			{ name: '令和8年1月臨時議会', nameEn: 'January Extraordinary Session 2026', opened: '2026-01-26', closes: '2026-01-26' },
			{ name: '令和8年2月定例議会', nameEn: 'February Regular Session 2026', opened: '2026-02-09', closes: '2026-03-17' },
			{ name: '令和8年3月臨時議会', nameEn: 'March Extraordinary Session 2026', opened: '2026-03-31', closes: '2026-03-31' },
			{ name: '令和8年6月定例議会', nameEn: 'June Regular Session 2026', opened: '2026-06-02', closes: '2026-06-25' },
			{ name: '令和8年7月臨時議会', nameEn: 'July Extraordinary Session 2026', opened: '2026-07-24', closes: '2026-07-24' },
			{ name: '令和8年9月定例議会', nameEn: 'September Regular Session 2026', opened: '2026-09-10', closes: '2026-10-22' }
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
		gaps: ['voteDate'],
		sessions: [
			{ name: '令和7年度定例会2月議会', nameEn: 'February Meeting 2026', opened: '2026-02-04', closes: '2026-03-31' },
			{ name: '令和8年度定例会6月議会', nameEn: 'June Meeting 2026', opened: '2026-06-12', closes: '2026-06-30' },
			{ name: '令和8年度定例会9月議会', nameEn: 'September Meeting 2026', opened: '2026-09-08', closes: '2026-09-29' }
		]
	},
	{
		id: 'tokyo/koto',
		name: '江東区議会',
		nameEn: 'Koto City Assembly',
		place: '江東区',
		placeEn: 'Koto',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		// Not collected yet: the board would be empty.
		published: false,
		hosts: ['www.city.koto.lg.jp'],
		// One index per calendar year: add the next year's in January.
		listPages: [{ label: '令和8年 議案審議結果', url: 'https://www.city.koto.lg.jp/650102/0801giannshinngikekka.html' }],
		// Source: each month's 議会日程 page (「令和8年第2回定例会は、6月10日…から7月1日…まで」), checked 2026-10-07.
		// 2027 統一地方選挙 (April): fill in when the dates are announced.
		election: null,
		gaps: ['afterClose', 'voteDate', 'committee', 'titleOnly'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-19', closes: '2026-03-27' },
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-05-25', closes: '2026-05-25' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-10', closes: '2026-07-01' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-16', closes: '2026-10-22' }
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
		gaps: ['voteDate'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-18', closes: '2026-03-27' },
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-05-27', closes: '2026-05-27' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-25', closes: '2026-07-09' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-17', closes: '2026-10-23' }
		]
	},
	{
		id: 'tokyo/meguro',
		name: '目黒区議会',
		nameEn: 'Meguro City Assembly',
		place: '目黒区',
		placeEn: 'Meguro',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.meguro.tokyo.jp'],
		// The adapter reads these in this order.
		listPages: [
			{ label: '本会議の資料', url: 'https://www.city.meguro.tokyo.jp/kusei/kugikai/kaigirokuiinkai/kaigi/hongikai/shiryou/index.html' },
			{ label: '本会議の議決結果', url: 'https://www.city.meguro.tokyo.jp/kusei/kugikai/kaigirokuiinkai/kaigi/hongikai/giketsukekka/index.html' },
			{ label: '議会日程・傍聴', url: 'https://www.city.meguro.tokyo.jp/kusei/kugikai/kaigirokuiinkai/kaisaiyotei/index.html' }
		],
		// Source: first and last 議事日程 on each session's 資料 page; 3rd from its 開催 page. Checked 2026-10-03.
		// 2027 統一地方選挙 (April): fill in when the dates are announced.
		election: null,
		gaps: ['afterClose'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-17', closes: '2026-03-23' },
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-05-26', closes: '2026-05-27' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-17', closes: '2026-06-30' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-03', closes: '2026-09-30' }
		]
	},
	{
		id: 'tokyo/ota',
		name: '大田区議会',
		nameEn: 'Ota City Assembly',
		place: '大田区',
		placeEn: 'Ota',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.ota.tokyo.jp'],
		listPages: [{ label: '令和8年 本会議', url: 'https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigi/r_8/index.html' }],
		// Source: 区議会の会議日程 (kaiginittei.html), checked 2026-10-02
		// 2027 統一地方選挙 (April): fill in when the dates are announced.
		election: null,
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-13', closes: '2026-03-25' },
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-05-26', closes: '2026-05-27' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-16', closes: '2026-06-25' },
			{ name: '令和8年第2回臨時会', nameEn: '2nd Extraordinary Session 2026', opened: '2026-07-21', closes: '2026-07-21' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-15', closes: '2026-10-15' }
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
		gaps: ['resultsAfterClose'],
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
		id: 'tokyo/toshima',
		name: '豊島区議会',
		nameEn: 'Toshima City Assembly',
		place: '豊島区',
		placeEn: 'Toshima',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		// Not collected yet: the board would be empty.
		published: false,
		hosts: ['www.city.toshima.lg.jp'],
		// One page per calendar year: add the next year's 会議結果 page when it appears.
		listPages: [{ label: '令和8年区議会の会議結果', url: 'https://www.city.toshima.lg.jp/368/2603191322.html' }],
		// Source: 会期 on each 会議結果 page; 第3回 from 定例会の予定 (/368/kuse/gikai/2501301054.html), checked 2026-10-07
		// 2027 統一地方選挙 (April): fill in when the dates are announced.
		election: null,
		gaps: ['afterClose', 'voteDate', 'committee', 'titleOnly'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-10', closes: '2026-03-24' },
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-05-28', closes: '2026-05-28' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-17', closes: '2026-07-06' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-16', closes: '2026-10-28' }
		]
	},
	{
		id: 'tokyo/itabashi',
		name: '板橋区議会',
		nameEn: 'Itabashi City Assembly',
		place: '板橋区',
		placeEn: 'Itabashi',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.itabashi.tokyo.jp'],
		// The adapter reads these in this order.
		listPages: [
			{ label: '議案の審査状況', url: 'https://www.city.itabashi.tokyo.jp/kugikai/gian/shinsa/index.html' },
			{ label: '議案書', url: 'https://www.city.itabashi.tokyo.jp/kugikai/gian/giansho/index.html' },
			{ label: '議案等の審査結果', url: 'https://www.city.itabashi.tokyo.jp/kugikai/gian/1011530.html' }
		],
		// Source: 会議の日程 (3rd), the 議案等の審査結果 link dates (1st), the 提出 date on 議案第42号 (2nd opening);
		// checked 2026-10-03. 2027 統一地方選挙 (April): fill in when the dates are announced.
		election: null,
		gaps: ['resultsAfterClose'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-13', closes: '2026-03-24' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-04', closes: '2026-06-22' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-18', closes: '2026-10-28' }
		]
	},
	{
		id: 'tokyo/nerima',
		name: '練馬区議会',
		nameEn: 'Nerima City Assembly',
		place: '練馬区',
		placeEn: 'Nerima',
		head: '区長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		// Not collected yet: the board would be empty.
		published: false,
		hosts: ['www.city.nerima.tokyo.jp'],
		// One page per calendar year: add the next year's index in January.
		listPages: [{ label: '令和8年 定例会情報', url: 'https://www.city.nerima.tokyo.jp/gikai/kaigi/r8/index.html' }],
		// Source: each session's 概要 page (「…までの19日間の会期」); 第三回 from the 区議会 top page (会期予定), checked 2026-10-07
		// 2027 統一地方選挙 (April): fill in when the dates are announced.
		election: null,
		gaps: ['voteDate'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-05', closes: '2026-03-13' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-01', closes: '2026-06-19' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-03', closes: '2026-10-09' }
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
	},
	// Tama area, in 団体コード order.
	{
		id: 'tokyo/hachioji',
		name: '八王子市議会',
		nameEn: 'Hachioji City Assembly',
		place: '八王子市',
		placeEn: 'Hachioji',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.hachioji.tokyo.jp'],
		// The adapter reads these in this order.
		listPages: [
			{ label: '令和8年（2026年）本会議', url: 'https://www.city.hachioji.tokyo.jp/contents/shigikai_1/gikainokatudou/honnkaigi/reiwa8/index.html' },
			{ label: '市長が市議会に提出した議案', url: 'https://www.city.hachioji.tokyo.jp/shisei/001/001/007/002/p022474.html' }
		],
		// Source: 会期 on each session's page, checked 2026-10-03
		election: null,
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-24', closes: '2026-03-27' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-08', closes: '2026-06-25' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-01', closes: '2026-10-07' }
		]
	},
	{
		id: 'tokyo/machida',
		name: '町田市議会',
		nameEn: 'Machida City Assembly',
		place: '町田市',
		placeEn: 'Machida',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.gikai-machida.jp'],
		listPages: [{ label: '議案の概要・議決結果', url: 'https://www.gikai-machida.jp/g07_giketsu.asp?Sflg=2' }],
		// Source: session dropdown on the 議案の概要・議決結果 page (g07 bill database), checked 2026-10-01
		election: null,
		sessions: [
			{ name: '令和8年1月臨時会（第1回）', nameEn: '1st Extraordinary Session 2026', opened: '2026-01-26', closes: '2026-01-26' },
			{ name: '令和8年3月定例会（第1回）', nameEn: '1st Regular Session 2026', opened: '2026-03-09', closes: '2026-03-30' },
			{ name: '令和8年6月定例会（第2回）', nameEn: '2nd Regular Session 2026', opened: '2026-06-01', closes: '2026-06-29' },
			{ name: '令和8年9月定例会（第3回）', nameEn: '3rd Regular Session 2026', opened: '2026-08-27', closes: '2026-09-30' }
		]
	},
	{
		id: 'tokyo/tachikawa',
		name: '立川市議会',
		nameEn: 'Tachikawa City Assembly',
		place: '立川市',
		placeEn: 'Tachikawa',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.tachikawa.lg.jp'],
		listPages: [{ label: '令和8年の各定例会・臨時会の概要', url: 'https://www.city.tachikawa.lg.jp/shigikai/katsudo/1007184/1026374/index.html' }],
		// Source: each session's 日程表 (first and last 本会議), checked 2026-10-01. Assembly elected 2026-06-21.
		election: null,
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-18', closes: '2026-03-24' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-05-07', closes: '2026-05-28' },
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-07-21', closes: '2026-07-21' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-04', closes: '2026-10-02' }
		]
	},
	{
		id: 'tokyo/musashino',
		name: '武蔵野市議会',
		nameEn: 'Musashino City Assembly',
		place: '武蔵野市',
		placeEn: 'Musashino',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.musashino.lg.jp'],
		listPages: [
			{ label: '令和8年 市長提出議案', url: 'https://www.city.musashino.lg.jp/shigikai/gian_seigan_chinzyo/shichogian/1053667.html' },
			{ label: '令和8年議員提出議案', url: 'https://www.city.musashino.lg.jp/shigikai/gian_seigan_chinzyo/giingian/1054064.html' }
		],
		// Source: 令和8年会議の結果・記録 (shigikai/kaigi_kekka/teireikai_rinjikai_kekka/1053870.html), checked 2026-10-01
		election: null,
		gaps: ['scanned'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-24', closes: '2026-03-27' },
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-05-11', closes: '2026-05-12' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-09', closes: '2026-06-25' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-01', closes: '2026-09-29' }
		]
	},
	{
		id: 'tokyo/ome',
		name: '青梅市議会',
		nameEn: 'Ome City Assembly',
		place: '青梅市',
		placeEn: 'Ome',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.ome.tokyo.jp'],
		listPages: [{ label: '議案審議結果一覧', url: 'https://www.city.ome.tokyo.jp/site/gikai/50399.html' }],
		// A year-long session from May; each meeting is listed as a session. Dates: first 提出日 and last
		// 議決日 on each meeting's 議案審議結果一覧, checked 2026-10-01.
		election: null,
		sessions: [
			{ name: '令和7年市議会定例会令和8年1月臨時議会', nameEn: '2025 Regular Session, January 2026 extraordinary meeting', opened: '2026-01-26', closes: '2026-01-26' },
			{ name: '令和7年市議会定例会令和8年2月定例議会', nameEn: '2025 Regular Session, February 2026 meeting', opened: '2026-02-24', closes: '2026-03-26' },
			{ name: '令和8年市議会定例会5月招集議会', nameEn: '2026 Regular Session, May meeting', opened: '2026-05-13', closes: '2026-05-13' },
			{ name: '令和8年市議会定例会6月定例議会', nameEn: '2026 Regular Session, June meeting', opened: '2026-06-11', closes: '2026-06-25' },
			{ name: '令和8年市議会定例会9月定例議会', nameEn: '2026 Regular Session, September meeting', opened: '2026-09-02', closes: '2026-09-29' }
		]
	},
	{
		id: 'tokyo/fuchu',
		name: '府中市議会',
		nameEn: 'Fuchu City Assembly',
		place: '府中市',
		placeEn: 'Fuchu',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.fuchu.tokyo.jp'],
		// Order matters to the adapter: bills, then results.
		listPages: [
			{ label: '令和8年市長提出議案', url: 'https://www.city.fuchu.tokyo.jp/gikai/shingi/segantinjo/sicyotesyutu/r8sicyotesyutu/index.html' },
			{ label: '議決内容', url: 'https://www.city.fuchu.tokyo.jp/gikai/shingi/naiyo/index.html' }
		],
		// Source: 会期日程 pages (gikai/shingi/gikai/), first and last 本会議, checked 2026-10-01.
		// 第1回臨時会 only had 専決処分, so it isn't listed.
		election: null,
		gaps: ['resultsAfterClose', 'voteDate'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-16', closes: '2026-03-16' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-04', closes: '2026-06-22' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-08-31', closes: '2026-09-30' }
		]
	},
	{
		id: 'tokyo/akishima',
		name: '昭島市議会',
		nameEn: 'Akishima City Assembly',
		place: '昭島市',
		placeEn: 'Akishima',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		// Not collected yet: the board would be empty.
		published: false,
		hosts: ['www.city.akishima.lg.jp'],
		// One page per calendar year: add the next year's 日程・審議結果等 index in January.
		listPages: [{ label: '令和8年 日程・審議結果等', url: 'https://www.city.akishima.lg.jp/gikai/honkaigi/1006709/1011604/index.html' }],
		// Source: the session links on the year page (「6月15日から7月1日まで17日間」), checked 2026-10-07
		election: null,
		gaps: ['committee', 'titleOnly'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-26', closes: '2026-03-26' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-15', closes: '2026-07-01' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-02', closes: '2026-10-05' }
		]
	},
	{
		id: 'tokyo/chofu',
		name: '調布市議会',
		nameEn: 'Chofu City Assembly',
		place: '調布市',
		placeEn: 'Chofu',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.chofu.lg.jp'],
		// Order matters to the adapter: bills, then results.
		listPages: [
			{ label: '市議会提出予定議案・資料（令和8年）', url: 'https://www.city.chofu.lg.jp/shiseijouhou/gikai/yoteigian/r08/index.html' },
			{ label: '会議結果（令和8年）', url: 'https://www.city.chofu.lg.jp/shiseijouhou/gikai/kaigikekka/r08/index.html' }
		],
		// Source: 会期 on each session's 会議結果 page, checked 2026-10-01
		election: null,
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-27', closes: '2026-03-26' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-01', closes: '2026-06-18' },
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-08-04', closes: '2026-08-04' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-01', closes: '2026-09-28' }
		]
	},
	{
		id: 'tokyo/hino',
		name: '日野市議会',
		nameEn: 'Hino City Assembly',
		place: '日野市',
		placeEn: 'Hino',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		// Not collected yet: the board would be empty.
		published: false,
		hosts: ['www.city.hino.lg.jp'],
		listPages: [{ label: '議案等審議一覧表', url: 'https://www.city.hino.lg.jp/shigikai/gian/index.html' }],
		// Source: 定例会等日程 (/shigikai/teireikai/), first to last day of each schedule table, checked 2026-10-07
		election: null,
		gaps: ['committee', 'titleOnly'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-03-09', closes: '2026-04-06' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-01', closes: '2026-06-17' },
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-07-30', closes: '2026-07-30' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-01', closes: '2026-10-07' }
		]
	},
	{
		id: 'tokyo/fussa',
		name: '福生市議会',
		nameEn: 'Fussa City Assembly',
		place: '福生市',
		placeEn: 'Fussa',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		// Not collected yet: the board would be empty.
		published: false,
		hosts: ['www.city.fussa.tokyo.jp'],
		// One page per calendar year: add the next year's 審議された議案 page in January.
		listPages: [{ label: '令和8年 審議された議案', url: 'https://www.city.fussa.tokyo.jp/assembly/meeting/bill/1020868/index.html' }],
		// Source: 会議の日程 (/assembly/meeting/schedule/1020712/), first to last day, checked 2026-10-07
		election: null,
		sessions: [
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-01-20', closes: '2026-01-20' },
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-03-03', closes: '2026-03-27' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-02', closes: '2026-06-19' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-01', closes: '2026-09-30' }
		]
	},
	{
		id: 'tokyo/komae',
		name: '狛江市議会',
		nameEn: 'Komae City Assembly',
		place: '狛江市',
		placeEn: 'Komae',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		// Not collected yet: the board would be empty.
		published: false,
		hosts: ['www.city.komae.tokyo.jp'],
		listPages: [{ label: '議案、請願・陳情等審査結果一覧', url: 'https://www.city.komae.tokyo.jp/index.cfm/49,145713,404,2590,html' }],
		// Source, checked 2026-10-07: 第1回定例会 from its 会期日程 PDF; 第3回定例会 from the 「日程（予定）」 news post.
		// 第2回定例会 and 第1回臨時会 are left out: no schedule was published for them (their results PDFs only give
		// 議決月日).
		election: null,
		gaps: ['afterClose', 'committee', 'titleOnly'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-20', closes: '2026-03-25' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-08-26', closes: '2026-10-05' }
		]
	},
	{
		id: 'tokyo/higashikurume',
		name: '東久留米市議会',
		nameEn: 'Higashikurume City Assembly',
		place: '東久留米市',
		placeEn: 'Higashikurume',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.higashikurume.lg.jp'],
		// The adapter reads these in this order.
		listPages: [
			{ label: '付議案件及び結果', url: 'https://www.city.higashikurume.lg.jp/gikai/kaigi/kekka/index.html' },
			{ label: '市長提出議案', url: 'https://www.city.higashikurume.lg.jp/shisei/jorei/1012538/index.html' }
		],
		// Source: each session's 会期日程表, checked 2026-10-03
		election: null,
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-26', closes: '2026-03-26' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-04', closes: '2026-06-23' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-01', closes: '2026-09-28' }
		]
	},
	{
		id: 'tokyo/higashiyamato',
		name: '東大和市議会',
		nameEn: 'Higashiyamato City Assembly',
		place: '東大和市',
		placeEn: 'Higashiyamato',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.higashiyamato.lg.jp'],
		// Order matters to the adapter: results, then bills.
		listPages: [
			{ label: '令和8年 審議結果', url: 'https://www.city.higashiyamato.lg.jp/shisei/gikai/1008119/1005679/1011960/index.html' },
			{ label: '令和8年 市長提出議案', url: 'https://www.city.higashiyamato.lg.jp/shisei/gikai/1008119/1005630/1011940/index.html' }
		],
		// Source: the dates in each 議案等審議結果 page title, checked 2026-10-01
		election: null,
		gaps: ['scanned'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-20', closes: '2026-03-23' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-02', closes: '2026-06-19' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-01', closes: '2026-09-25' }
		]
	},
	{
		id: 'tokyo/kokubunji',
		name: '国分寺市議会',
		nameEn: 'Kokubunji City Assembly',
		place: '国分寺市',
		placeEn: 'Kokubunji',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		// Not collected yet: the board would be empty.
		published: false,
		hosts: ['www.city.kokubunji.tokyo.jp'],
		listPages: [
			{ label: '提出議案一覧', url: 'https://www.city.kokubunji.tokyo.jp/shisei/gian/1037676/index.html' },
			{ label: '本会議 審議結果', url: 'https://www.city.kokubunji.tokyo.jp/shigikai/gikai_info_katsudou/honkaigi/index.html' }
		],
		// Source: the first and last 本会議 in each month's 議会日程 page, checked 2026-10-07.
		election: null,
		gaps: ['resultsAfterClose', 'committee'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-20', closes: '2026-03-23' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-01', closes: '2026-06-23' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-01', closes: '2026-09-30' }
		]
	},
	{
		id: 'tokyo/kunitachi',
		name: '国立市議会',
		nameEn: 'Kunitachi City Assembly',
		place: '国立市',
		placeEn: 'Kunitachi',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.kunitachi.tokyo.jp'],
		listPages: [{ label: '令和8年 会議日程・結果', url: 'https://www.city.kunitachi.tokyo.jp/soshiki/Dept09/Div01/Sec02/gyomu/gikai_kaigi_nittei_kekka/0304/r8/index.html' }],
		// Source: 開会 and 閉会 in each session's 会議結果報告, checked 2026-10-03.
		// 第1回臨時会 (2026-02-05) had no ordinance bills.
		election: null,
		gaps: ['resultsAfterClose', 'committee'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-24', closes: '2026-03-24' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-08', closes: '2026-06-26' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-08-27', closes: '2026-09-16' }
		]
	},
	{
		id: 'tokyo/musashimurayama',
		name: '武蔵村山市議会',
		nameEn: 'Musashimurayama City Assembly',
		place: '武蔵村山市',
		placeEn: 'Musashimurayama',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		// Not collected yet: the board would be empty.
		published: false,
		hosts: ['www.city.musashimurayama.lg.jp'],
		// Overwritten every session: collect each session while it is up, and add the next one here.
		listPages: [{ label: '議決結果（最新の定例会）', url: 'https://www.city.musashimurayama.lg.jp/shisei/shigikai/1022404/kaigi/1022506.html' }],
		// Source: the 会議名・会議日数等 table on that page, checked 2026-10-07. Earlier sessions' dates aren't published.
		election: null,
		gaps: ['committee', 'titleOnly'],
		sessions: [{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-01', closes: '2026-09-25' }]
	},
	{
		id: 'tokyo/tama',
		name: '多摩市議会',
		nameEn: 'Tama City Assembly',
		place: '多摩市',
		placeEn: 'Tama',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.tama.lg.jp'],
		// The adapter reads these in this order.
		listPages: [
			{ label: '令和8年 会議結果', url: 'https://www.city.tama.lg.jp/shigikai/kaigi/kekka/1019561/index.html' },
			{ label: '令和8年 提出（予定）議案', url: 'https://www.city.tama.lg.jp/shigikai/kaigi/yotei/1019487/index.html' }
		],
		// Source: first 提出月日 and last 議決月日 on each 会議結果 page; 3rd from 市議会の日程. Checked 2026-10-03.
		// 第1回臨時会 (2026-02-10) had no ordinance bills.
		election: null,
		gaps: ['afterClose', 'committee'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-26', closes: '2026-03-30' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-05', closes: '2026-06-30' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-01', closes: '2026-10-06' }
		]
	},
	{
		id: 'tokyo/inagi',
		name: '稲城市議会',
		nameEn: 'Inagi City Assembly',
		place: '稲城市',
		placeEn: 'Inagi',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.inagi.tokyo.jp'],
		listPages: [{ label: '令和8年 議会の動き', url: 'https://www.city.inagi.tokyo.jp/gikai/ugoki/1013693/index.html' }],
		// Source: first and last 本会議 in each session's 会期日程, checked 2026-10-03
		election: null,
		gaps: ['afterClose'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-26', closes: '2026-03-30' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-12', closes: '2026-07-02' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-01', closes: '2026-09-29' }
		]
	},
	{
		id: 'tokyo/hamura',
		name: '羽村市議会',
		nameEn: 'Hamura City Assembly',
		place: '羽村市',
		placeEn: 'Hamura',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		// Not collected yet: the board would be empty.
		published: false,
		hosts: ['www.city.hamura.tokyo.jp'],
		// The bills page is per calendar year: replace it with the next year's in January.
		listPages: [
			{ label: '令和8年市長提出議案', url: 'https://www.city.hamura.tokyo.jp/0000020396.html' },
			{ label: '令和8年議事日程', url: 'https://www.city.hamura.tokyo.jp/category/8-15-1-23-0-0-0-0-0-0.html' }
		],
		// Source: each session's 議事日程 page, first to last sitting day, checked 2026-10-07
		election: null,
		sessions: [
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-02-02', closes: '2026-02-02' },
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-03-03', closes: '2026-03-26' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-02', closes: '2026-06-23' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-01', closes: '2026-09-29' }
		]
	},
	{
		id: 'tokyo/akiruno',
		name: 'あきる野市議会',
		nameEn: 'Akiruno City Assembly',
		place: 'あきる野市',
		placeEn: 'Akiruno',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		hosts: ['www.city.akiruno.tokyo.jp'],
		listPages: [{ label: '会議開催状況', url: 'https://www.city.akiruno.tokyo.jp/0000000464.html' }],
		// A year-long 定例会 with several meetings, each listed as a session. Source: the 日程 table on each
		// meeting's page, checked 2026-10-01. The 開会会議 of 第1回定例会 (1月6日) had no ordinances.
		election: null,
		gaps: ['committee'],
		sessions: [
			{ name: '令和8年第1回定例会第1回臨時会議', nameEn: '2026 1st Regular Session, 1st extraordinary meeting', opened: '2026-01-15', closes: '2026-01-15' },
			{ name: '令和8年第1回定例会3月定例会議', nameEn: '2026 1st Regular Session, March meeting', opened: '2026-02-16', closes: '2026-03-26' },
			{ name: '令和8年第1回定例会6月定例会議', nameEn: '2026 1st Regular Session, June meeting', opened: '2026-05-28', closes: '2026-06-18' },
			{ name: '令和8年第2回定例会開会会議', nameEn: '2026 2nd Regular Session, opening meeting', opened: '2026-08-04', closes: '2026-08-04' }
		]
	},
	{
		id: 'tokyo/nishitokyo',
		name: '西東京市議会',
		nameEn: 'Nishitokyo City Assembly',
		place: '西東京市',
		placeEn: 'Nishitokyo',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		// Not collected yet: the board would be empty.
		published: false,
		hosts: ['www.city.nishitokyo.lg.jp'],
		listPages: [{ label: '令和8年 日程・付議案件・結果', url: 'https://www.city.nishitokyo.lg.jp/sigikai/nittei_kekka/nittei_anken/r8/index.html' }],
		// Source: each session's 会期内日程表 PDF (first day + 会期), checked 2026-10-07. 第3回定例会 is from the
		// 日程表（案）.
		election: null,
		gaps: ['voteDate', 'titleOnly'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-26', closes: '2026-03-27' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-05', closes: '2026-06-23' },
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-07-06', closes: '2026-07-06' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-08-28', closes: '2026-09-30' }
		]
	},
	{
		id: 'tokyo/hinode',
		name: '日の出町議会',
		nameEn: 'Hinode Town Assembly',
		place: '日の出町',
		placeEn: 'Hinode',
		head: '町長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'tokyo',
		// Not collected yet: the board would be empty.
		published: false,
		hosts: ['www.town.hinode.tokyo.jp'],
		listPages: [{ label: '審議結果', url: 'https://www.town.hinode.tokyo.jp/category/10-4-4-0-0-0-0-0-0-0.html' }],
		// Source: 会期 on each 議案結果 page, checked 2026-10-07. Later 2026 sessions aren't posted yet; add them
		// when their 議案結果 pages appear.
		election: null,
		gaps: ['voteDate', 'titleOnly'],
		sessions: [
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-02-10', closes: '2026-02-10' },
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-27', closes: '2026-03-17' }
		]
	},
	// 神奈川県. Kept off the site (published: false) until it is decided how to present a second prefecture:
	// there is no 神奈川県議会 entry, and the home map only zooms into Tokyo.
	{
		id: 'kanagawa/yokohama',
		name: '横浜市会',
		nameEn: 'Yokohama City Council',
		place: '横浜市',
		placeEn: 'Yokohama',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'kanagawa',
		published: false,
		hosts: ['www.city.yokohama.lg.jp'],
		listPages: [{ label: '本会議の結果／議案', url: 'https://www.city.yokohama.lg.jp/shikai/kiroku/kekka/' }],
		// Source: 過去の定例会の日程 (/shikai/nittei/kako/nitteir80N.html), first to last 本会議, checked 2026-10-07.
		// 第3回's 決算 runs on after 9月25日; extend closes when the schedule says.
		election: null,
		gaps: ['voteDate', 'committee'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-01-28', closes: '2026-03-24' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-05-15', closes: '2026-06-05' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-07', closes: '2026-09-25' }
		]
	},
	{
		id: 'kanagawa/kawasaki',
		name: '川崎市議会',
		nameEn: 'Kawasaki City Council',
		place: '川崎市',
		placeEn: 'Kawasaki',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'kanagawa',
		published: false,
		hosts: ['www.city.kawasaki.jp'],
		// One index per calendar year: add the next year's in January.
		listPages: [{ label: '令和8年 定例会・臨時会の会議結果', url: 'https://www.city.kawasaki.jp/shisei/category/40-7-25-21-0-0-0-0-0-0.html' }],
		// Source: 「令和8年 定例会・臨時会等の日程・発言要旨」 (開会 and 閉会 sittings), checked 2026-10-07; 第1回 and
		// 第2回 match their 会議結果 PDFs.
		// 2027 統一地方選挙 (April): fill in when the dates are announced.
		election: null,
		gaps: ['committee'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-12', closes: '2026-03-18' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-01', closes: '2026-06-24' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-08-31', closes: '2026-10-13' }
		]
	},
	{
		id: 'kanagawa/fujisawa',
		name: '藤沢市議会',
		nameEn: 'Fujisawa City Assembly',
		place: '藤沢市',
		placeEn: 'Fujisawa',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'kanagawa',
		published: false,
		hosts: ['shigikai.city.fujisawa.kanagawa.jp'],
		listPages: [{ label: '議案の概要と議決結果', url: 'https://shigikai.city.fujisawa.kanagawa.jp/g07_giketsu.asp?Sflg=2' }],
		// Source: session dropdown on the 議案の概要と議決結果 page (g07 bill database), checked 2026-10-07
		election: null,
		sessions: [
			{ name: '令和8年2月定例会', nameEn: 'February Regular Session 2026', opened: '2026-02-12', closes: '2026-03-18' },
			{ name: '令和8年5月臨時会', nameEn: 'May Extraordinary Session 2026', opened: '2026-05-22', closes: '2026-05-22' },
			{ name: '令和8年6月定例会', nameEn: 'June Regular Session 2026', opened: '2026-06-04', closes: '2026-06-25' },
			{ name: '令和8年9月定例会', nameEn: 'September Regular Session 2026', opened: '2026-09-01', closes: '2026-10-09' }
		]
	},
	{
		id: 'kanagawa/zushi',
		name: '逗子市議会',
		nameEn: 'Zushi City Assembly',
		place: '逗子市',
		placeEn: 'Zushi',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'kanagawa',
		published: false,
		hosts: ['www.city.zushi.kanagawa.jp'],
		// One page per calendar year for each kind of session: add the next year's in January.
		listPages: [
			{ label: '令和8年 定例会の議案概要と審議結果', url: 'https://www.city.zushi.kanagawa.jp/shisei/gikai/1005359/1013727/1013728/index.html' },
			{ label: '令和8年 臨時会の議案概要と審議結果', url: 'https://www.city.zushi.kanagawa.jp/shisei/gikai/1005359/1013727/1013733/index.html' }
		],
		// Source: 会議日程 (/shisei/gikai/1005216/1013693/), first 本会議 plus 会期 days, checked 2026-10-07
		election: null,
		sessions: [
			{ name: '令和8年第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-01-20', closes: '2026-01-20' },
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-05', closes: '2026-02-27' },
			{ name: '令和8年第2回臨時会', nameEn: '2nd Extraordinary Session 2026', opened: '2026-04-13', closes: '2026-04-13' },
			{ name: '令和8年第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-11', closes: '2026-06-25' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-09-08', closes: '2026-10-02' }
		]
	},
	{
		id: 'kanagawa/hadano',
		name: '秦野市議会',
		nameEn: 'Hadano City Assembly',
		place: '秦野市',
		placeEn: 'Hadano',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'kanagawa',
		published: false,
		hosts: ['www.city.hadano.kanagawa.jp'],
		// One page per calendar year: add the next year's in January.
		listPages: [{ label: '令和8年 会議の概要・結果', url: 'https://www.city.hadano.kanagawa.jp/gikai/teireikai-rinjikai/2/16_1/index.html' }],
		// A year-long session meeting as 定例月会議 and 臨時会議. Source: the dated headings on each meeting's
		// 概要・結果 page, first to last day, checked 2026-10-07
		election: null,
		sessions: [
			{ name: '令和8年3月第1回定例月会議', nameEn: '2026 March meeting', opened: '2026-02-26', closes: '2026-03-26' },
			{ name: '令和8年6月第2回定例月会議', nameEn: '2026 June meeting', opened: '2026-06-04', closes: '2026-06-23' },
			{ name: '令和8年7月第1回臨時会議', nameEn: '2026 1st extraordinary meeting', opened: '2026-07-30', closes: '2026-07-30' },
			{ name: '令和8年9月第3回定例月会議', nameEn: '2026 September meeting', opened: '2026-09-02', closes: '2026-09-30' }
		]
	},
	{
		id: 'kanagawa/ebina',
		name: '海老名市議会',
		nameEn: 'Ebina City Assembly',
		place: '海老名市',
		placeEn: 'Ebina',
		head: '市長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'kanagawa',
		published: false,
		hosts: ['ebina.gijiroku.com'],
		listPages: [{ label: '議案とその議決結果', url: 'https://ebina.gijiroku.com/g07_giketsu.asp?Sflg=2' }],
		// Source: session dropdown on the 議案とその議決結果 page (g07 bill database), checked 2026-10-07
		election: null,
		sessions: [
			{ name: '令和8年1月第1回臨時会', nameEn: '1st Extraordinary Session 2026', opened: '2026-01-16', closes: '2026-01-16' },
			{ name: '令和8年3月第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-24', closes: '2026-03-26' },
			{ name: '令和8年4月第2回臨時会', nameEn: '2nd Extraordinary Session 2026', opened: '2026-04-22', closes: '2026-04-22' },
			{ name: '令和8年6月第2回定例会', nameEn: '2nd Regular Session 2026', opened: '2026-06-02', closes: '2026-06-18' },
			{ name: '令和8年7月第3回臨時会', nameEn: '3rd Extraordinary Session 2026', opened: '2026-07-23', closes: '2026-07-23' },
			{ name: '令和8年9月第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-08-27', closes: '2026-09-30' }
		]
	},
	{
		id: 'kanagawa/yugawara',
		name: '湯河原町議会',
		nameEn: 'Yugawara Town Assembly',
		place: '湯河原町',
		placeEn: 'Yugawara',
		head: '町長',
		headEn: 'Mayor',
		level: 'muni',
		parent: 'kanagawa',
		published: false,
		hosts: ['www.town.yugawara.kanagawa.jp'],
		listPages: [{ label: '本会議審議議案', url: 'https://www.town.yugawara.kanagawa.jp/soshiki/9/24532.html' }],
		// Source: the session headings on the 本会議審議議案（令和8年） page, checked 2026-10-07
		election: null,
		gaps: ['voteDate'],
		sessions: [
			{ name: '令和8年第1回定例会', nameEn: '1st Regular Session 2026', opened: '2026-02-24', closes: '2026-03-13' },
			{ name: '令和8年第2回臨時会', nameEn: '2nd Extraordinary Session 2026', opened: '2026-04-02', closes: '2026-04-02' },
			{ name: '令和8年第3回定例会', nameEn: '3rd Regular Session 2026', opened: '2026-06-09', closes: '2026-06-23' },
			{ name: '令和8年第4回定例会', nameEn: '4th Regular Session 2026', opened: '2026-09-01', closes: '2026-09-29' }
		]
	}
];

export const allHosts = assemblies.flatMap((a) => a.hosts);
