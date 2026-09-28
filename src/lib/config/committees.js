// Committee glossary and department → committee mappings.
// Tokyo: /outline/jurisdiction.html. Shibuya: /about/2023021000185/. Suginami names its committee per bill.
// English names are our own unofficial translations; never let the LLM translate these.

/** @type {Record<string, string>} */
export const committeeEn = {
	総務委員会: 'General Affairs Committee',
	財政委員会: 'Finance Committee',
	文教委員会: 'Education and Culture Committee',
	都市整備委員会: 'Urban Development Committee',
	厚生委員会: 'Health and Welfare Committee',
	'経済・港湾委員会': 'Economy and Port Committee',
	'環境・建設委員会': 'Environment and Construction Committee',
	公営企業委員会: 'Public Enterprise Committee',
	'警察・消防委員会': 'Police and Fire Committee',
	都市環境委員会: 'Urban Environment Committee',
	区民福祉委員会: 'Residents and Welfare Committee',
	総務財政委員会: 'General Affairs and Finance Committee',
	区民生活委員会: 'Residents Life Committee',
	保健福祉委員会: 'Health and Welfare Committee'
};

/** @type {Record<string, Record<string, string>>} assembly id → department → committee */
export const committeeByDepartment = {
	tokyo: {
		政策企画局: '総務委員会',
		子供政策連携室: '総務委員会',
		総務局: '総務委員会',
		デジタルサービス局: '総務委員会',
		人事委員会: '総務委員会',
		選挙管理委員会: '総務委員会',
		監査委員: '総務委員会',
		財務局: '財政委員会',
		主税局: '財政委員会',
		会計管理局: '財政委員会',
		収用委員会: '財政委員会',
		生活文化局: '文教委員会',
		都民安全総合対策本部: '文教委員会',
		スポーツ推進本部: '文教委員会',
		教育委員会: '文教委員会',
		教育庁: '文教委員会',
		都市整備局: '都市整備委員会',
		住宅政策本部: '都市整備委員会',
		福祉局: '厚生委員会',
		保健医療局: '厚生委員会',
		産業労働局: '経済・港湾委員会',
		中央卸売市場: '経済・港湾委員会',
		スタートアップ戦略推進本部: '経済・港湾委員会',
		港湾局: '経済・港湾委員会',
		労働委員会: '経済・港湾委員会',
		環境局: '環境・建設委員会',
		建設局: '環境・建設委員会',
		交通局: '公営企業委員会',
		水道局: '公営企業委員会',
		下水道局: '公営企業委員会',
		公安委員会: '警察・消防委員会',
		警視庁: '警察・消防委員会',
		東京消防庁: '警察・消防委員会'
	},
	'tokyo/shibuya': {
		経営企画部: '総務委員会',
		デジタルサービス部: '総務委員会',
		総務部: '総務委員会',
		危機管理対策部: '総務委員会',
		会計管理室: '総務委員会',
		産業観光文化部: '都市環境委員会',
		都市整備部: '都市環境委員会',
		まちづくり推進部: '都市環境委員会',
		土木部: '都市環境委員会',
		環境政策部: '都市環境委員会',
		学びとスポーツ部: '文教委員会',
		子ども家庭部: '文教委員会',
		教育委員会: '文教委員会',
		区民部: '区民福祉委員会',
		福祉部: '区民福祉委員会',
		健康推進部: '区民福祉委員会'
	}
};
