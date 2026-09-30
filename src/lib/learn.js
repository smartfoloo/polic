// 学ぶ: short explainers, written by hand (not the LLM). Legal points follow 地方自治法 (Local Autonomy
// Act); keep them neutral and check any change against the law. A block is a paragraph, numbered `steps`
// or labelled `items`, each [label, text].

/** @typedef {string | { steps: [string, string][] } | { items: [string, string][] }} Block */
/** @typedef {{ title: string, desc: string, lead: string, body: Block[] }} Text */
/** @typedef {{ slug: string, group: 'gov' | 'bills', ja: Text, en: Text }} Topic */

export const groups = /** @type {const} */ ({
	gov: { ja: '地方自治のしくみ', en: 'How local government works' },
	bills: { ja: '議案と議会', en: 'Bills and the assembly' }
});

/** @type {Topic[]} */
export const topics = [
	{
		slug: 'local-government',
		group: 'gov',
		ja: {
			title: '地方自治のしくみ',
			desc: '住民が、首長と議員の両方を選ぶ。',
			lead: '都道府県や市区町村では、住民が選挙で、首長（知事や市区町村長）と議員の両方を選びます。これを「二元代表制」といいます。',
			body: [
				{
					items: [
						['首長', '自治体の代表です。役所を動かし、予算や条例の案を作ります。'],
						['議会', '住民が選んだ議員の集まりです。条例や予算を決め、首長の仕事をチェックします。'],
						['住民', '選挙で首長と議員を選びます。任期はどちらも4年です。']
					]
				},
				'国では、国会が総理大臣を選びます。地方では首長も住民が直接選ぶので、首長と議会は対等な立場です。首長が案を作り、議会が審議して決める、というのが基本の形です。',
				'意見が合わないときのしくみもあります。首長は、議会の議決に異議があれば、もう一度審議するよう求めることができます（再議）。議会は、議員の3分の2以上が出席し、その4分の3以上が賛成すれば、首長の不信任を議決できます。そのとき首長は、議会を解散することができます。'
			]
		},
		en: {
			title: 'How local government works',
			desc: 'Residents elect both the head and the assembly.',
			lead: 'In prefectures, cities, towns and wards, residents elect both the head of government (a governor or mayor) and the members of the assembly. This is called dual representation.',
			body: [
				{
					items: [
						['The head', 'Leads the local government, runs city hall, and drafts the budget and ordinances.'],
						['The assembly', "The members residents elected. It decides ordinances and the budget, and checks the head's work."],
						['Residents', 'Elect both the head and the members. Both serve four-year terms.']
					]
				},
				'Nationally, the Diet chooses the prime minister. Locally, residents elect the head directly too, so the head and the assembly stand on equal footing. The basic pattern is that the head drafts proposals and the assembly debates and decides them.',
				'There are rules for when they disagree. If the head objects to a decision, they can ask the assembly to reconsider it. If at least two-thirds of members are present and three-quarters of them vote for it, the assembly can pass a vote of no confidence in the head, who can then dissolve the assembly.'
			]
		}
	},
	{
		slug: 'head',
		group: 'gov',
		ja: {
			title: '首長と役所',
			desc: '知事や区長は、予算を作り、役所を動かす。',
			lead: '首長（東京都なら知事、区なら区長）は、自治体の仕事をまとめる責任者です。',
			body: [
				{
					items: [
						['予算の案を作る', '1年間のお金の使い方の案です。予算案を議会に出せるのは首長だけです。'],
						['条例の案を出す', '議会に出される条例案の多くは、首長が出したものです。'],
						['役所を動かす', '実際の仕事は、首長のもとで職員が行います。議会で決まった条例や予算にそって、事業を進めます。'],
						['規則を定める', '法律や条例の範囲で、細かい手続きなどを「規則」として定めます。規則は議会の議決がいりません。']
					]
				},
				'Policでは、首長が出した議案に「区長の提案」「知事の提案」と表示しています。'
			]
		},
		en: {
			title: 'The head and city hall',
			desc: 'The governor or mayor drafts the budget and runs city hall.',
			lead: "The head of government (the governor for Tokyo, the mayor for a ward) is responsible for the local government's work.",
			body: [
				{
					items: [
						['Drafts the budget', 'The plan for how money is spent over the year. Only the head can submit a budget to the assembly.'],
						['Proposes ordinances', 'Most ordinances put before the assembly come from the head.'],
						['Runs city hall', 'Staff under the head do the actual work, carrying out programs under the ordinances and budget the assembly decided.'],
						['Makes regulations', "Within the law and ordinances, the head sets detailed procedures as regulations, which don't need an assembly vote."]
					]
				},
				`On Polic, bills from the head are labelled "Mayor's proposal" or "Governor's proposal".`
			]
		}
	},
	{
		slug: 'assembly',
		group: 'gov',
		ja: {
			title: '議会と議員',
			desc: '条例や予算を決め、首長の仕事をチェックする。',
			lead: '議会は、住民が選んだ議員の集まりです。自治体の大事なことは、議会の議決がないと決まりません。',
			body: [
				{
					items: [
						['決める', '条例をつくる・変える・なくすこと、予算、決算の認定、大きな契約などを議決します。'],
						['チェックする', '質問をしたり資料を求めたりして、首長や役所の仕事を調べます。'],
						['提案する', '議員も条例案を出せます。国などに意見書を出すこともあります。']
					]
				},
				'議長は議員の中から選ばれ、会議を進めます。',
				'議会の中では、考えの近い議員どうしで「会派」というグループを作って活動することが多いです。'
			]
		},
		en: {
			title: 'The assembly and its members',
			desc: "Decides ordinances and the budget, and checks the head's work.",
			lead: "The assembly is made up of the members residents elected. Important matters for the local government can't be decided without its vote.",
			body: [
				{
					items: [
						['Decides', 'Votes on making, changing and repealing ordinances, the budget, approval of the accounts, large contracts and more.'],
						['Checks', 'Asks questions and requests documents to examine the work of the head and city hall.'],
						['Proposes', 'Members can submit ordinances too, and can send formal opinions to the national government and others.']
					]
				},
				'The chair is elected from among the members and runs the meetings.',
				'Inside the assembly, members with similar views often work together in groups called caucuses.'
			]
		}
	},
	{
		slug: 'tokyo-wards',
		group: 'gov',
		ja: {
			title: '東京都と23区',
			desc: '23区は「特別区」。都と仕事を分けあっている。',
			lead: '東京の23区は「特別区」という自治体です。区長も区議会議員も住民の選挙で選ばれ、市とほぼ同じように仕事をしています。',
			body: [
				'区長を住民が直接選べるようになったのは、1975年からです。',
				'ただし、ふつうは市が行う仕事の一部を、23区では東京都がまとめて行っています。たとえば、上下水道や消防です。',
				'お金のしくみも独特です。本来は市のものになる税の一部（固定資産税など）を都が集め、その一定の割合を23区に配り直しています（都区財政調整制度）。',
				'そのため、同じ地域のことでも、区議会で決まるものと都議会で決まるものがあります。Policでは、区議会と都議会の両方の議案を載せています。'
			]
		},
		en: {
			title: 'Tokyo and its 23 wards',
			desc: 'The 23 wards are "special wards" that share work with the metropolis.',
			lead: "Tokyo's 23 wards are local governments called special wards. Residents elect the mayor and the assembly, and a ward works much like a city.",
			body: [
				'Residents have elected their ward mayors directly since 1975.',
				'But in the 23 wards, the Tokyo Metropolitan Government handles some work that a city would normally do, such as water, sewerage and the fire service.',
				'Money works differently too. The metropolitan government collects some taxes that would normally go to a city, such as fixed asset tax, and passes a set share back to the 23 wards.',
				'So some local matters are decided by the ward assembly and others by the Tokyo Metropolitan Assembly. Polic covers bills from both.'
			]
		}
	},
	{
		slug: 'residents',
		group: 'gov',
		ja: {
			title: '住民ができること',
			desc: '選挙のほかにも、議会に関わる方法がある。',
			lead: '首長と議員を選ぶのは住民です。選挙のほかにも、次のような関わり方があります。',
			body: [
				{
					items: [
						['選挙', '18歳以上で、その自治体に3か月以上住んでいる日本国籍の人が投票できます。'],
						['傍聴', '本会議は公開が原則で、だれでも見に行けます。委員会も多くの議会で傍聴できます。インターネットで中継や録画を公開している議会も多くあります。'],
						['請願・陳情', '議会に要望を出せます。請願には議員の紹介が必要で、陳情には必要ありません。請願は委員会などで審議されます。陳情の扱いは議会によって違います。'],
						['直接請求', '有権者の50分の1以上の署名を集めると、条例をつくる・変える・なくすことを首長に請求できます（税や手数料に関するものは除きます）。首長は、これを議会にかけます。']
					]
				},
				'原則として有権者の3分の1以上の署名があれば、首長や議員の解職、議会の解散を求めることもできます。'
			]
		},
		en: {
			title: 'What residents can do',
			desc: 'There are ways to take part beyond voting.',
			lead: 'Residents elect the head and the assembly. Beyond voting, there are other ways to take part.',
			body: [
				{
					items: [
						['Voting', 'Japanese citizens aged 18 or over who have lived in the area for at least three months can vote.'],
						['Watching', 'Plenary sessions are open, and anyone can go and watch. Many assemblies let the public watch committees too, and many stream meetings or post recordings online.'],
						['Petitions', "You can send the assembly a request. A formal petition needs a member to introduce it; an informal one doesn't. Formal petitions are considered in committee or elsewhere; how informal ones are handled varies by assembly."],
						['Direct demands', 'With signatures from at least one-fiftieth of voters, residents can ask the head to make, change or repeal an ordinance (except ones about taxes or fees). The head then puts it to the assembly.']
					]
				},
				'With signatures from, as a rule, at least one-third of voters, residents can also demand the recall of the head or a member, or the dissolution of the assembly.'
			]
		}
	},
	{
		slug: 'bill-flow',
		group: 'bills',
		ja: {
			title: '議案が決まるまで',
			desc: '提案から実施まで、5つのステップ。',
			lead: '議案は、だいたい次の順番で進みます。Policの各議案にある進み具合は、この流れのどこまで進んだかを表しています。',
			body: [
				{
					steps: [
						['提案', '首長や議員が、議案を議会に出します。'],
						['委員会', '本会議で、議案の分野を担当する委員会に審査が任されます（付託）。委員会で質問や議論をして、賛成か反対かを決めます。'],
						['本会議', '議員全員が集まる本会議で、委員会の報告を聞いてから、最終的に採決します。'],
						['決定・否決', '出席した議員の過半数が賛成すれば可決、そうでなければ否決です。賛成と反対が同じ数のときは、議長が決めます。'],
						['実施', '可決された条例は首長が公布し、決められた日（施行日）から効力をもちます。']
					]
				},
				'委員会を通らないこともあります。急ぎの議案などは、委員会に任せずに本会議ですぐ採決することがあります（付託省略）。',
				'会期中に結論が出なかった議案は、原則としてそこで終わりになります（廃案）。ただし議会が認めれば、委員会が閉会中も審査を続け、あとの会期で結論を出すことがあります（継続審査）。Policでは、継続審査の議案も「審議中」と表示しています。'
			]
		},
		en: {
			title: 'How a bill is decided',
			desc: 'Five steps from proposal to taking effect.',
			lead: 'Bills usually move in this order. The progress tracker on each Polic bill shows how far along this flow it has come.',
			body: [
				{
					steps: [
						['Proposed', 'The head or members submit a bill to the assembly.'],
						['Committee', 'In a plenary session, the bill is referred to the committee for its area. The committee asks questions, debates, and decides whether to support it.'],
						['Plenary', "All members meet in a plenary session, hear the committee's report, and take the final vote."],
						['Passed or rejected', 'It passes if a majority of the members present vote for it, and is rejected otherwise. If the vote is tied, the chair decides.'],
						['In effect', 'The head promulgates a passed ordinance, and it takes effect on the date it sets.']
					]
				},
				'Some bills skip committee. Urgent bills, for example, may be voted on in the plenary session straight away.',
				'As a rule, a bill not decided by the end of a session lapses. But if the assembly agrees, the committee can keep examining it while the assembly is not sitting and reach a decision in a later session. Polic shows these carried-over bills as "Under review".'
			]
		}
	},
	{
		slug: 'committee',
		group: 'bills',
		ja: {
			title: '委員会とは',
			desc: '議案をくわしく調べるのは、主に委員会。',
			lead: '委員会は、議員が分野ごとに分かれた少人数のグループです。議案の細かい質問や議論は、ほとんどが委員会で行われます。',
			body: [
				'分野ごとにずっと置かれている「常任委員会」（総務、福祉、建設など）と、特定のテーマのために作られる「特別委員会」があります。議会の運営について話し合う「議会運営委員会」もあります。',
				'委員会では、議員が役所の担当者に質問し、議案の中身や理由を確かめます。本会議を見るだけではわからない議論の中身は、委員会の記録にあることが多いです。',
				'委員会の結論は本会議に報告され、本会議で最終的に決まります。Policの各議案には、審査した委員会の名前を載せています。'
			]
		},
		en: {
			title: 'What is a committee?',
			desc: 'Committees are where bills are examined in detail.',
			lead: 'A committee is a small group of members assigned to one area. Most detailed questions and debate on a bill happen in committee.',
			body: [
				'Standing committees always exist, one per area, such as general affairs, welfare or construction. Special committees are set up for a particular topic. A steering committee discusses how the assembly is run.',
				"In committee, members question city officials to check what a bill does and why. Much of the debate you can't see by watching only the plenary session is in the committee records.",
				'The committee reports its conclusion to the plenary session, which makes the final decision. Each bill on Polic names the committee that examined it.'
			]
		}
	},
	{
		slug: 'plenary',
		group: 'bills',
		ja: {
			title: '本会議とは',
			desc: '議員全員が集まり、最後に決める場。',
			lead: '本会議は、すべての議員が集まる会議です。議案を最終的に決めるのはここです。',
			body: [
				'本会議では、議案の提案理由の説明、委員会への付託、委員会からの報告、そして採決が行われます。',
				'議員が地域の課題について首長や役所に質問する「一般質問」も、本会議で行われます。議会によっては、会派を代表して質問する「代表質問」もあります。',
				'議長が会議を進め、採決は出席した議員の過半数で決まります。'
			]
		},
		en: {
			title: 'What is a plenary session?',
			desc: 'Where all members meet and make the final decision.',
			lead: "A plenary session is a meeting of all members. It's where bills are finally decided.",
			body: [
				'In plenary sessions, bills are introduced with their reasons, referred to committees, reported back, and voted on.',
				'General questions, where members question the head and city officials about local issues, also happen in plenary sessions. Some assemblies also hold representative questions, asked on behalf of a caucus.',
				'The chair runs the meeting, and votes are decided by a majority of the members present.'
			]
		}
	},
	{
		slug: 'sessions',
		group: 'bills',
		ja: {
			title: '定例会と臨時会',
			desc: '議会は、期間を区切って開かれる。',
			lead: '議会は、決まった期間（会期）を区切って開かれます。会期には「定例会」と「臨時会」があります。',
			body: [
				{
					items: [
						['定例会', '毎年、条例で決めた回数だけ開かれます。年4回（2月ごろ、6月ごろ、9月ごろ、11〜12月ごろ）の議会が多いです。'],
						['臨時会', '決める必要のある議案があるときに、その議案のために開かれます。']
					]
				},
				'議会を開くこと（招集）は、首長が行います。',
				'呼び方は議会によって違います。「第3回定例会」のように番号で呼ぶ議会もあれば、墨田区議会のように1年度を1つの定例会とし、「6月議会」「9月議会」のように分けて開く議会もあります。',
				'新しい年度（4月から）の予算は、2月ごろからの定例会で審議されることがほとんどです。'
			]
		},
		en: {
			title: 'Regular and extraordinary sessions',
			desc: 'Assemblies sit for set periods.',
			lead: 'Assemblies meet in set periods called sessions. There are regular sessions and extraordinary sessions.',
			body: [
				{
					items: [
						['Regular sessions', 'Held a set number of times each year, fixed by ordinance. Many assemblies hold four: around February, June, September, and November or December.'],
						['Extraordinary sessions', 'Held when there is business that needs deciding, for that business.']
					]
				},
				'The head convenes the assembly.',
				'Names vary by assembly. Some number their sessions, like "3rd Regular Session". Others, like Sumida City, treat each fiscal year as one regular session and meet in parts such as the "June Meeting" and "September Meeting".',
				'The budget for the new fiscal year, which starts in April, is almost always debated in the session that begins around February.'
			]
		}
	},
	{
		slug: 'ordinance',
		group: 'bills',
		ja: {
			title: '条例とは',
			desc: '議会で決める、地域のルール。',
			lead: '条例は、都道府県や市区町村が、議会の議決を経て定める地域のルールです。法律の範囲内で、その地域に合わせたルールを決められます。',
			body: [
				'たとえば、施設の使用料や手数料、補助のしくみ、役所の組織、職員の給与なども条例で決まっています。違反に罰則をつけることもできます。',
				'条例の多くは、すでにある条例の一部を変える「〜の一部を改正する条例」です。どこが変わるかは、新旧対照表という資料で確かめられます。',
				'議会に出される議案には、条例のほかに予算、決算、契約、人事などがあります。いまのPolicは、条例をつくる・変える・なくす議案を載せています。'
			]
		},
		en: {
			title: 'What is an ordinance?',
			desc: 'Local rules decided by the assembly.',
			lead: "An ordinance is a local rule that a prefecture, city, town or ward makes with the assembly's vote. Within the law, it lets an area set rules that fit its needs.",
			body: [
				'Facility charges and fees, support programs, how city hall is organized and staff pay, for example, are all set by ordinance. Ordinances can also set penalties for breaking them.',
				'Most ordinances change part of an existing one. A comparison table of the old and new wording shows exactly what changes.',
				'Besides ordinances, assemblies vote on budgets, accounts, contracts, appointments and more. For now, Polic covers bills that make, change or repeal ordinances.'
			]
		}
	},
	{
		slug: 'who-proposes',
		group: 'bills',
		ja: {
			title: '議案を出す人',
			desc: '首長の提案と、議員の提案。',
			lead: '議案を議会に出せるのは、首長と議員です。',
			body: [
				{
					items: [
						['首長の提案', '議案の多くはこちらです。役所が準備した案を、首長の名前で出します。予算を出せるのは首長だけです。'],
						['議員の提案', '議員が議案を出すには、議員定数の12分の1以上の賛成が必要です。委員会が議案を出すこともできます。']
					]
				},
				'Policでは、議員が出した議案に「議員の提案」と表示しています。議員の提案は本文が公開されず、題名だけのことがあります。その場合は、Policでも題名と結果だけを載せています。'
			]
		},
		en: {
			title: 'Who submits bills',
			desc: 'Proposals from the head, and from members.',
			lead: 'Bills can be submitted to the assembly by the head or by members.',
			body: [
				{
					items: [
						["The head's proposals", 'Most bills. City hall prepares them and the head submits them. Only the head can submit a budget.'],
						["Members' proposals", "A member needs the support of at least one-twelfth of the assembly's seats to submit a bill. Committees can submit bills too."]
					]
				},
				`On Polic, bills from members are labelled "Members' proposal". Their text is sometimes not published; then Polic shows only the title and the result.`
			]
		}
	}
];

