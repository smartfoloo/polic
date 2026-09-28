// Fixed topic list for the board's filter chips. The drafting model must pick one of these.
// The first seven come from the design; the rest cover the real ordinances seen in Step 3.

/** @type {{ ja: string, en: string }[]} */
export const categories = [
	{ ja: '住宅', en: 'Housing' },
	{ ja: '交通', en: 'Transport' },
	{ ja: '子育て', en: 'Children & families' },
	{ ja: '防災', en: 'Disaster & fire safety' },
	{ ja: 'デジタル', en: 'Digital' },
	{ ja: '福祉', en: 'Welfare' },
	{ ja: '環境', en: 'Environment' },
	{ ja: '教育', en: 'Education' },
	{ ja: '健康・医療', en: 'Health' },
	{ ja: 'まちづくり', en: 'Urban planning' },
	{ ja: '税・手数料', en: 'Taxes & fees' },
	{ ja: 'くらし・手続き', en: 'Everyday procedures' },
	{ ja: '行政のしくみ', en: 'How government works' }
];
