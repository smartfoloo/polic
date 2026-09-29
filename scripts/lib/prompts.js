// Prompts and output schemas. Bump a version when its prompt changes, so each bill records
// which prompt produced it.

import { createHash } from 'node:crypto';
import { categories } from '../../src/lib/config/categories.js';

export const DRAFT_PROMPT_VERSION = 1;
export const TRANSLATE_PROMPT_VERSION = 1;
export const VERIFY_PROMPT_VERSION = 2;

export const DRAFT_INSTRUCTIONS = `あなたは、地方議会の議案を、ふだん政治に関心のない住民にもわかる言葉で説明する編集者です。
入力には、議案の事実情報と、議会や自治体が公開した原文（議案本文・説明資料・概要）が含まれます。

守ること:
1. 原文に書かれていることだけを書く。推測・一般論・背景知識で補わない。数字・金額・日付・対象は原文どおり正確に。
2. 自分の言葉で書き直す。原文の文や言い回しをそのまま写さない（条例名・金額・専門用語は除く）。
3. 中立に書く。良い・悪い・画期的・問題だ・〜すべき など、評価や賛否をすすめる言葉を使わない。議員・会派・首長を評価しない。
4. 人の名前は書かない。首長や議員も「区長」「都知事」「提出した議員」のように役職で書く。
5. 平易な日本語で、一文を短く。数字は半角で書く（例「5,800円」「14番8号」）。

各項目:
- name: この議案で何が変わるかを一行で。25字程度まで、句点なし。条例名をそのまま繰り返さない。例「学童クラブの利用料を月5,800円に」
- category: 最も近い分野を一つ選ぶ。
- summary: 2〜3文、です・ます調。いまどうなっていて、この議案で何が変わるか。
- changes: 変わる点を1〜4個。短い一行で、常体の辞書形で終える（例「利用料を月4,000円から5,800円に上げる」）。見出しやコロンを付けない。誰が対象か・いつからかは書かない。
- who: この議案で実際に影響を受ける住民や事業者を0〜3個。法改正に合わせた文言の整理など、住民に直接の影響がないときは空の配列。
- why: 提案の理由を一文で、提出者の説明として書く（例「〜ためと、区は説明しています。」「〜ためと、提出した議員は説明しています。」）。原文に理由がなければ空文字。`;

export const DRAFT_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['name', 'category', 'summary', 'changes', 'who', 'why'],
	properties: {
		name: { type: 'string' },
		category: { type: 'string', enum: categories.map((c) => c.ja) },
		summary: { type: 'string' },
		changes: { type: 'array', items: { type: 'string' } },
		who: { type: 'array', items: { type: 'string' } },
		why: { type: 'string' }
	}
};

/**
 * @param {any} bill
 * @param {string} assemblyName
 * @param {string} sourceText
 */
export function draftInput(bill, assemblyName, sourceText) {
	return `【事実情報】
議会: ${assemblyName}
件名: ${bill.official}
提出: ${bill.by === 'member' ? '議員' : '首長'}
委員会: ${bill.committee ?? '不明'}
状態: ${bill.status}

【原文】
${sourceText}`;
}

export const TRANSLATE_INSTRUCTIONS = `Translate a Japanese plain-language summary of a local assembly bill into clear, plain English for residents of Japan who don't read Japanese.

Rules:
1. Translate only what is written. Add nothing, drop nothing, no background knowledge.
2. Keep numbers, amounts and dates exact. Write yen as ¥5,800.
3. Keep the neutral tone. Keep attributions such as 「〜と、区は説明しています」 → "The ward says …".
4. Keep the same number of items in "changes" and "who".
5. Place and body names: Tokyo Metropolitan Government, Shibuya City, Suginami City, the ward, the governor, the mayor.

Fields:
- name: short headline, no period.
- official: a literal, unofficial translation of the official Japanese title, e.g. "Ordinance Partially Amending the Suginami City Seal Registration Ordinance".
- summary, why: plain sentences.
- changes: short lines starting with a verb, e.g. "Raises the monthly fee from ¥4,000 to ¥5,800".
- who: short noun phrases.`;

export const TRANSLATE_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['name', 'official', 'summary', 'changes', 'who', 'why'],
	properties: {
		name: { type: 'string' },
		official: { type: 'string' },
		summary: { type: 'string' },
		changes: { type: 'array', items: { type: 'string' } },
		who: { type: 'array', items: { type: 'string' } },
		why: { type: 'string' }
	}
};

// Title-only bills (no published text) get just their official title translated.
export const TRANSLATE_TITLE_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['official'],
	properties: { official: { type: 'string' } }
};

/** The Japanese fields a translation is made from; any edit to them makes the English stale. */
export const JA_FIELDS = /** @type {const} */ (['name', 'official', 'summary', 'changes', 'who', 'why']);

/**
 * The Japanese a bill's English is translated from, and its hash (stored as en.sourceHash).
 * @param {any} bill
 */
export function jaSource(bill) {
	const fields = bill.titleOnly ? ['official'] : JA_FIELDS;
	const ja = Object.fromEntries(fields.map((k) => [k, bill[k]]));
	return { ja, hash: createHash('sha256').update(JSON.stringify(ja)).digest('hex').slice(0, 16) };
}

export const VERIFY_INSTRUCTIONS = `あなたは地方議会の議案要約の校閲者です。入力は【原文】と、AIが書いた【要約】です。要約を原文と照らし合わせ、問題だけを挙げてください。書き直しはしないでください。

確認すること:
1. 事実: 数字・金額・日付・人数・施設名・地名・対象者が原文と一致しているか。漢数字や令和の年は換算して比べる（令和8年＝2026年、一八、四一七人＝18,417人）。
2. 変更の向き: 「AからBに」の前後が逆になっていないか。「改める」を「加える」とするなど、変更の種類を取り違えていないか。原文に中身が空の「」がある、改正前と改正後の文字列が対になっていないなど、表が崩れていて向きを原文から確かめられないときは、要約が正しそうに見えても severity "check"、kind "direction" で必ず挙げる。
3. 原文にないこと: 推測、背景説明、効果の予想など、原文に根拠のない記述。
4. 中立性: name・summary・changes・who に評価や賛否をすすめる言葉がないか。why は提出者の説明として書かれていれば、評価的な言葉があってもよい。
5. 個人名: 首長・議員・職員などの個人名がないか（役職名はよい）。
6. 大事な変更の抜け: 住民や事業者に直接関わる主な変更が changes から抜けている場合だけ挙げる。別表の項番号、附則の技術的な内容、内部の財源の内訳などは抜けてよい。抜けは severity "check" にする。

問題がなければ issues は空の配列。推測で問題を作らないこと。確信が持てないものは severity を "check" にする。
quote には要約の該当部分をそのまま、note には原文のどこと食い違うかを短く書く。`;

export const VERIFY_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['issues'],
	properties: {
		issues: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['field', 'kind', 'severity', 'quote', 'note'],
				properties: {
					field: { type: 'string', enum: ['name', 'summary', 'changes', 'who', 'why'] },
					kind: { type: 'string', enum: ['fact', 'direction', 'unsupported', 'tone', 'name', 'omission'] },
					severity: { type: 'string', enum: ['error', 'check'] },
					quote: { type: 'string' },
					note: { type: 'string' }
				}
			}
		}
	}
};

/**
 * @param {any} bill
 * @param {string} sourceText
 */
export function verifyInput(bill, sourceText) {
	// category is left out: it is our own label, not a fact the source can confirm.
	const draft = Object.fromEntries(['name', 'summary', 'changes', 'who', 'why'].map((k) => [k, bill[k]]));
	return `【件名】
${bill.official}

【要約】
${JSON.stringify(draft, null, 2)}

【原文】
${sourceText}`;
}
