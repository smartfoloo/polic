// Prompts and output schemas. Bump a version when its prompt changes, so each bill records
// which prompt produced it.

import { categories } from '../../src/lib/config/categories.js';

export const DRAFT_PROMPT_VERSION = 1;
export const TRANSLATE_PROMPT_VERSION = 1;

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
