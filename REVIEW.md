# Reviewing bills

The AI writes drafts; code and a second AI pass check them; you review what they hold back. You don't read every bill.

## What goes live

`scripts/lib/publish.js` decides, and `npm run review` shows the result.

| State | When | On the site |
|---|---|---|
| **reviewed** | You set `"approved": true`. | 「人が確認済み」 |
| **auto** | Unapproved, but: not a member bill with an AI summary, `npm run verify` ran on the current draft, no code flags, and no AI issues other than "omission" notes. Title-only bills (no AI text) are auto too. | 「AIが作成した要約です。まだ人が確認していません。」 |
| **held** | Anything else: member bills, flagged bills, drafts not checked yet, and **every bill in an election window** (`election` in `src/lib/config/assemblies.js`). | Not shown |

The checks (`npm run verify`, after `npm run draft`):
- **Code** (`scripts/lib/checks.js`): 25+ characters copied from the source (except in `why`, which is the proposer's reason and attributed to them); an empty 「」 in the source, which means a before/after table lost its contents; a `why` that isn't attributed to the proposer; a headline over 30 characters.
- **AI** (`gpt-6.1-sol`, medium effort, prompt in `scripts/lib/prompts.js`): facts and numbers against the source, direction of changes, unsupported claims, tone outside `why`, personal names, and main changes missing from `changes`. Missing-change notes don't hold a bill; they show as optional improvements.
- **One fix** (`fixBill` in `scripts/lib/pipeline.js`): when the check finds problems, the drafter rewrites the draft once from the notes (keeping text a note got wrong), and a fresh check runs. Only what that second check still flags holds the bill. The notes it worked from are kept in `draft.fixed.notes`. A broken source table isn't sent, since no rewrite changes it. `npm run verify -- --no-fix` skips it. About 1¢ per flagged bill.

## The loop

1. Run `npm run dev` and open **http://localhost:5173/admin**. The left side lists what needs you: **held** bills and approved bills whose **facts changed**. Everything else is already live and sits under a collapsed **Optional** section: the **spot-check sample** (about 1 in 10 live bills, fixed by id), **English** to review, and **could be more complete** notes. **English out of date** clears with `npm run translate`, not by hand. `npm run review` prints the same in the terminal (`-- --all` lists the optional bills too).
2. Open a bill. The source text the AI read (`cache/text/<id>.txt`, local only) is on the left, with links to the official pages and PDFs; when in doubt, the PDF wins. The draft is on the right, with the checker's notes under each field and any numbers the source doesn't contain.
3. Fix what the notes point at, using the checklist below. **Save** (⌘S) writes `data/<assembly>/<id>.json` and re-runs the code checks.
4. **Approve & next** sets `"approved": true` (this also clears the hold) and opens the next bill.
5. Commit, a batch at a time, e.g. `chore: Approve held Suginami bills`.

If a draft is beyond fixing, **Re-draft with AI…** runs `draft`, `verify` and the one fix for that bill again (about 1–2¢; it asks first). From the terminal: delete its `"draft"` key and run `npm run draft -- <id>` and `npm run verify -- <id>`.

**Resolved flags.** A flag that turns out to be wrong after checking the source (an official name flagged as copied, a broken table the draft makes no claim from), or that has been fixed in the text, can be marked resolved with a short reason (`checks.dismissedFlags` for code flags, `dismissed` on an AI issue). It no longer holds the bill: the bill goes live like any unchecked one, without being approved. The admin page shows resolved flags greyed out with the reason and a **Reopen** button. A new draft (`npm run draft`) replaces the checks, so this doesn't carry over to text it wasn't made on.

The admin page only exists under `npm run dev`; the production server answers 404.

## Japanese checklist

Read the draft against the source, not from memory.

**Facts**
- [ ] Every number, amount, date, place and group in `summary`, `changes`, `who` and `why` appears in the source. Watch kanji numerals (「一八、四一七人」 = 18,417人) and 令和 → 西暦 conversions.
- [ ] Before/after is the right way round. Comparison tables (新旧対照表) often lose their layout in PDFs, so the old and new values can be swapped or look like additions. Check the PDF (example: shibuya-r8-3-47, where the text loses the table but the PDF shows both addresses, so one is added).
- [ ] Nothing is added that the source doesn't say: no background, no predictions, no "this means that…".
- [ ] `changes` covers the main changes. For a long ordinance, the 1–4 most important ones are enough.

**Wording**
- [ ] Our own words in `name`, `summary`, `changes` and `who`. No sentence copied or closely paraphrased from the 説明資料 or 概要. Official names, amounts and legal terms may be reused. `why` may keep the 提案理由's wording, since it is attributed to the proposer.
- [ ] Neutral. No judgement words: 画期的, ようやく, 問題, 不十分, 大幅な負担増, 待望の, 〜すべき. Describe what changes; let readers judge.
- [ ] `why` is attributed to the proposer: 「〜ためと、区は説明しています。」 / 「〜と、提出した議員は説明しています。」. Never state the reason as fact.
- [ ] No personal names, only roles: 区長, 都知事, 提出した議員.
- [ ] Plain Japanese, short sentences, half-width digits (5,800円).
- [ ] Dates as 西暦: 2026年12月25日 (matches the rest of the site).

**Headline and fields**
- [ ] `name` says what changes in about 25 characters, is not just the official title again, and is distinguishable from sibling bills (Tokyo R8 第3回 has five similar 性暴力防止 bills; each headline should name its facility type).
- [ ] `category` is the closest of the 13 in `src/lib/config/categories.js`.
- [ ] `who` lists people or businesses actually affected. Leave it empty (`[]`) only when residents aren't directly affected (staff quotas, clause renumbering). **An empty `who` moves the bill to the bottom of the board**, so it's an editorial call: check it.
- [ ] Sensitive subjects (abuse, crime, illness) in plain but careful words.

**Facts parsed by code** (don't edit these to fix wording; they come back on the next `collect`)
- [ ] `status`, `stage`, `committee`, `date` look plausible. If one is wrong, it's a parser bug: note it and tell whoever maintains the adapters instead of editing the JSON.

## Title-only bills

Bills with `"titleOnly": true` (Tokyo member bills) have no published text, so there is no AI summary. They go live automatically with their official title, status and source link.

## Facts changed after approval

When `npm run collect` finds new facts for an approved bill (a vote happened, a committee was assigned), it keeps the bill approved and adds `"factsUpdated": "<date>"`. Check that the summary still reads correctly with the new status, then press **Facts OK** (or delete the `factsUpdated` line) and commit.

## English

English is translated from **our Japanese summary**, never from the source. `npm run translate` runs for every live bill (reviewed or auto) and marks each result `"en": { "approved": false, … }`; the site labels unapproved English as an unchecked machine translation.

- [ ] Compare `en` with the Japanese fields in the same file, not with the source.
- [ ] Numbers, amounts (¥5,800) and dates match exactly.
- [ ] Same number of `changes` and `who` items as the Japanese.
- [ ] Attribution kept: "The ward says…", "The metropolitan government says…", "The assembly member who submitted it says…".
- [ ] Neutral, plain English; no additions.
- [ ] `official` is a literal translation of the Japanese title. The site labels it "unofficial translation".
- Committee and assembly names aren't in `en`; they come from the glossary in `src/lib/config/`.

Then press **Approve English** on the English tab (or set `"en": { "approved": true, … }`) and commit.

Editing any Japanese field later makes the English out of date: `npm run review` lists it, and `npm run translate` redoes it and resets `en.approved` to `false`.

## Election period

Ward elections (統一地方選挙, April 2027) for Shibuya, Suginami, Shinjuku and Setagaya. Add the official notice date (告示日) and election day here once they're announced.

- Put the dates in `election` for each ward in `src/lib/config/assemblies.js`. From the notice date through election day nothing goes live without your approval, and the popular-bills strip is off.
- In that window, don't approve new **member bills** (議員提出議案) for those wards. Mayor bills you've reviewed can still go live.
- In the months before: extra care that nothing reads as favouring or criticising a member, faction or the mayor.

## Corrections from readers

Reports arrive through the "report an error" link. Fix the JSON, commit with the report date in the message (`fix: Correct date on suginami-r8-3-84 (reported 2026-10-02)`), and reply to the sender.
