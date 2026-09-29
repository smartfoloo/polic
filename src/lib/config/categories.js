// Fixed topic list for the board's filter chips. The drafting model must pick one of these.
// The first seven come from the design; the rest cover the real ordinances seen in Step 3.

/** @type {{ ja: string, emoji: string, en: string }[]} emoji is the card picture, fixed per topic */
export const categories = [
	{ ja: '住宅', emoji: '🏠', en: 'Housing' },
	{ ja: '交通', emoji: '🚌', en: 'Transport' },
	{ ja: '子育て', emoji: '👶', en: 'Children & families' },
	{ ja: '防災', emoji: '⛑️', en: 'Disaster & fire safety' },
	{ ja: 'デジタル', emoji: '💻', en: 'Digital' },
	{ ja: '福祉', emoji: '🤝', en: 'Welfare' },
	{ ja: '環境', emoji: '🌳', en: 'Environment' },
	{ ja: '教育', emoji: '🏫', en: 'Education' },
	{ ja: '健康・医療', emoji: '🏥', en: 'Health' },
	{ ja: 'まちづくり', emoji: '🏗️', en: 'Urban planning' },
	{ ja: '税・手数料', emoji: '💴', en: 'Taxes & fees' },
	{ ja: 'くらし・手続き', emoji: '📄', en: 'Everyday procedures' },
	{ ja: '行政のしくみ', emoji: '🏛️', en: 'How government works' }
];
