# Polic — Bill Summary Backend Plan

Scope: the **bill board only** (議案). Meeting summaries (会議) are out of scope for now.
Pilot assemblies: 東京都議会, 渋谷区議会, 杉並区議会.
Design reference: `.skillslab/generated/2026-09-26-gikai-board-website/direction-a/none/index.html`

Goal: keep the app as simple as possible.

---

## Decisions

| Topic | Decision |
|---|---|
| App | SvelteKit + `adapter-static` (Vite). Node is only used to build and run scripts. |
| Language | **JavaScript** with light JSDoc on shared shapes (Assembly, Bill); no TypeScript. `npm run check` type-checks `src/` and `scripts/` via `jsconfig.json`. Decided 2026-09-28. |
| Hosting | Static files served by **Caddy** on the VPS. No server process, no API. |
| Storage | One JSON file per bill in `data/<assembly>/<bill-id>.json`. Git history is the audit trail. No database. |
| Review | No admin UI. Drafts are written with `"approved": false`; a reviewer edits the JSON and sets `"approved": true`. |
| Pipeline | One command, `npm run update`, run by hand during sessions (or one weekly cron). |
| Session dates | Hardcoded in `src/lib/config/assemblies.js` (~4 sessions/year per assembly). |
| LLM | **OpenAI API, `gpt-6-sol`** ($2 / $10 per 1M in/out; ~$4–10/year for us) via the official `openai` npm SDK, one model for drafting and translation, id kept in one constant. Reasoning effort: **`high` for drafting** (accuracy), **`low` for translation** (rewording reviewed text). Log reasoning tokens in each bill's `draft` metadata. Chosen over `gpt-6-luna` ($0.10 / $0.50) because the saving is a few dollars a year and misstatements are the top legal risk. Only writes the plain-language fields and English translations. Key in `.env` as `OPENAI_API_KEY`. Decided 2026-09-28. |
| Bill scope | Resident-facing only: ordinances (条例) and member bills (議員提出議案). Skip budgets (decided 2026-09-28: only the total is parseable), contracts, reports, lawsuits, 諮問, settlements, appointments. |
| Votes | No per-faction votes (会派別賛否) in v1. Show result only. |
| Corrections | `mailto:` "report an error" link on every bill. |
| English | Translated from **our approved Japanese summary**, never from source documents (translation is a copyright-holder right, Art. 27). Separate `en.approved` flag; until then English pages show the Japanese with an "English coming soon" note. Decided 2026-09-28. |
| English URLs | `/en/` prefix (`/en/tokyo/bills/x`), both languages prerendered. SvelteKit optional `[[lang=lang]]` route param. |
| Fixed terms | Committee names, assembly names and status/stage labels come from a hardcoded glossary, never the LLM. Official titles are LLM-translated and labelled "unofficial translation". |
| Bill order | Facts only, never an LLM "importance" ranking (neutrality). (1) Still being decided (提案中/審議中), current session, soonest vote first; (2) decided (決定/否決), newest first; (3) bills with an empty `who` (no direct effect on residents) last. Ties by bill number. Decided 2026-09-28. |
| Popular bills | 「よく見られている」 strip above the board, separate from the main order (no feedback loop). A bill shows only with **≥ N unique visitors in the last 14 days** (start N = 30); if none qualify the strip is hidden. Counts are never displayed. Off during the election freeze. Decided 2026-09-28. |
| View counting | No new server: the bill page fires one beacon request (`/v/<bill-id>`) that Caddy answers `204` and logs; a nightly script counts unique (hashed IP + UA, per bill, per day) views from the log, writes `popular.json`, and rebuilds. Beacon, not page loads, because SvelteKit navigates client-side and preloads on hover. Caddy logs kept 7–14 days; only aggregates stored. Decided 2026-09-28. |
| Permission | Not legally required for this design. **Notify** each 議会事務局 before crawling; don't wait for a reply. |

## Non-negotiables (from the legal briefing)

These stay no matter how much we simplify:

1. **Polite fetching**: at most 1 request every 5–10s, off-peak, respect robots.txt, identifying user-agent with contact email, only fetch listed pages/PDFs (no search forms, no URL guessing), stop on any error or slowdown.
2. **Facts are parsed, never generated**: official title, number, status, dates, committee, stage come from the source by code. The LLM never writes these.
3. **New wording only**: summaries restate facts in our own words. Never copy or closely paraphrase explanatory prose (条例案概要, 議案説明資料 are likely copyrighted).
4. **Human approval** before anything is public.
5. **Source link + AI disclosure** on every bill (English pages also say the translation is unofficial and Japanese is authoritative).
6. **Scope filter** keeps personal data out (no lawsuits, settlements, appointments, petitions).
7. **Neutral tone**: no evaluative language, no rankings.
8. **Privacy policy** page with a contact for corrections / takedown. It must name the LLM provider (OpenAI, US) because bill text is sent abroad for processing (APPI Art. 28). OpenAI API terms (checked 2026-09-28): API data is not used for training unless opted in; abuse-monitoring logs kept up to 30 days. Recheck before launch.
9. **Election period** (ward elections April 2027): no new content about specific members from the official notice date through election day; extra care in review before then.

---

## Sources

| Assembly | Bill list + results | Bill content | Notes |
|---|---|---|---|
| 東京都議会 | HTML table per session: `https://www.gikai.metro.tokyo.lg.jp/bill/reg2026-3.html` (number, title, result; head bills and member bills in separate tables) | 条例案概要 as HTML in a TMG press release (linked from the session page, e.g. `metro.tokyo.lg.jp/information/press/2026/09/2026091107`) | robots.txt blocks `/record/*` and `*.htm` (not needed). Committee referral location **unknown** → Step 1. |
| 渋谷区議会 | Results PDF per session: `https://shibukugi.tokyo/kaigi_kekka/2023020600027/` | One PDF per bill + outline PDF: `https://shibukugi.tokyo/kaigi_oshirase/2023021400039/` | robots.txt only blocks GPTBot. Results PDF includes a vote grid (ignored in v1). |
| 杉並区議会 | HTML table per session with **committee referral inline**: `https://www.city.suginami.tokyo.jp/kugikai/kaigi/giangiketsu/index.html` | 提案事項 page per session with one PDF per bill + 議案説明資料 PDF (e.g. `/s007/28566.html`) | No robots.txt. Cleanest source → build first. |

All three sites are "all rights reserved" (no PDL / CC BY).

### Step 1 findings (checked 2026-09-28)

**Status before the vote.** Every source leaves the result blank until the vote.
- Tokyo and Suginami: blank result cell = pending (審議中). Values seen: 原案可決, 否決, 同意, 承認, 棄却すべき旨答申, 意見付採択.
- Shibuya: pending bills appear only on the 議案等について page. Results arrive as a PDF after the session (e.g. `contents20262_0617.pdf`).

**Committee referral.**
| Assembly | How to get it |
|---|---|
| Suginami | Inline in the results table title, e.g. `（保健福祉委員会付託案件）`. Parse it directly. |
| Tokyo | Not published per bill. **Derive it**: the TMG press release lists each ordinance's 所管局 (e.g. 福祉局), and `/outline/jurisdiction.html` maps 所管局 → committee (福祉局 → 厚生委員会). Hardcode that 9-row mapping in config. |
| Shibuya | Not published per bill. **Derive it**: 「各議案の担当所管一覧」 PDF (`20263_shok.pdf`) gives 所管部 per bill, and `/about/2023021000185/` maps 部 → committee (区民部 → 区民福祉委員会). Hardcode that 4-row mapping. |

Budgets are the exception: they get split across committees or go to a 予算/決算特別委員会. For budgets, leave `committee` for the reviewer.

**Bill content per assembly.**
| Assembly | Best input for the LLM | Notes |
|---|---|---|
| Tokyo | **Press release HTML** 条例案概要: category, 所管局, 概要, 施行期日, plus a link to the bill PDF. | Covers ordinances only. Budgets and member bills have **no content document**, only a title. The assembly site's titles use only 第二水準 kanji, so take the official title from the press release. |
| Suginami | **議案説明資料 PDF** (`setumei.pdf`): one section per bill (`（議案第８２号）`, with 趣旨, 概要, 実施時期), plus the bill PDF (full text, 提案理由, 新旧対照表). | Best source of the three. Some bills have no 説明資料 section (e.g. 第88–91号). |
| Shibuya | Bill PDF (`20263_gian_047.pdf`) with a short （説明）, plus a one-line 概要 per bill in the outline PDF. | Thinnest source, so summaries will be shorter. Member bills are at `20263_ggia_NN.pdf`. |

**PDF extraction with `unpdf`: works, with 4 caveats.**
1. Vertical text (Tokyo bill PDFs, Suginami 説明資料) comes out with a space between every character → strip spaces between CJK characters.
2. Tokyo uses kanji numerals (第百六十四号, 令和八年九月十八日) → normalize when parsing numbers and dates.
3. Tables come out of order (Shibuya 別表 edits, budget tables). The only reliable budget fact is 第1条's total (e.g. `8,525,787 千円を増額`).
4. Shibuya's results PDF parses reliably by **text position**: find the result word (可決/否決/同意/…) and join the left-column text at the same height. Tested on the 第2回定例会 PDF; all 19 rows matched.

The submission date is inside each bill PDF (`令和８年９月９日提出`).

---

## Bill JSON format

Matches the fields the design already uses.

```jsonc
{
  "id": "suginami-r8-3-84",
  "assembly": "tokyo/suginami",
  "approved": false,

  // Facts: parsed by code, never by the LLM
  "number": "第84号",
  "official": "杉並区立児童青少年センター及び児童館条例の一部を改正する条例",
  "by": "head",                     // head | member
  "session": "令和8年第3回定例会",
  "committee": "保健福祉委員会",
  "stage": 1,                       // 0 提案 · 1 委員会 · 2 本会議 · 3 決定/否決 · 4 実施 (the design's stepper)
  "status": "審議中",               // 提案中 | 審議中 | 決定 | 否決
  "dateKind": "提案",               // 提案 | 可決 | 否決 (vote date only where published: Suginami)
  "date": "2026-09-01",
  "titleOnly": true,                // only when no text is published (Tokyo member bills)
  "factsUpdated": "2026-10-19",     // set when facts change on an approved bill → reviewer rechecks
  "sources": [{ "label": "議案第84号", "url": "https://…", "fetchedAt": "2026-09-28" }],

  // Plain language: LLM draft, human reviewed
  "name": "…",                      // one-line caption
  "category": "子育て",             // one of src/lib/config/categories.js
  "summary": "…",
  "changes": ["…"],
  "who": ["…"],                     // only if it actually affects residents
  "why": "…",
  // stageNote is NOT stored: the site builds it from stage/status/committee so it never goes stale.

  "draft": { "model": "gpt-6-sol", "effort": "high", "promptVersion": 1, "generatedAt": "…", "inputTokens": 0, "outputTokens": 0, "reasoningTokens": 0 },

  // English: translated from the approved Japanese fields above, reviewed separately
  "en": {
    "approved": false,
    "sourceHash": "…",               // hash of the JA fields it was translated from; mismatch = stale
    "name": "…", "official": "…",    // official = unofficial translation
    "summary": "…", "changes": ["…"], "who": ["…"], "why": "…"   // title-only bills: just "official"
  }
}
```

---

## Steps

### Step 1 — Check the sources (read-only, no code)
- [x] Find where Tokyo publishes which committee each bill is referred to (needed for the stepper). → derived from 所管局; see *Step 1 findings*.
- [x] Download 3–4 Shibuya and Suginami bill PDFs and confirm text extracts cleanly with `unpdf`. → works, with 4 caveats.
- [x] Confirm how each site shows bill status before the vote (blank result = 審議中?). → yes.
- [x] Write findings into this file under *Sources*.
- [x] Budgets: left out of v1.

### Step 2 — Scaffold
- [x] SvelteKit + `adapter-static` at the repo root (leave `.skillslab/` untouched). Config lives in `vite.config.js` (new SvelteKit style); `scripts/` is type-checked by `npm run check`.
- [x] `src/lib/config/assemblies.js`: the three assemblies, their source URLs, hardcoded session dates (verified sessions only; Suginami 第1回 end date was ambiguous, Shibuya only 第3回 so far).
- [x] `scripts/lib/fetch.js`: polite fetcher (6s per-host throttle, user-agent with `POLIC_CONTACT`, robots.txt, host allowlist, 12h cache + ETag/If-Modified-Since, stop on any error or >10s response, weekday 08–19 JST guard with `--daytime` override). Cache in `cache/` (gitignored). Tested against a local server.
- [x] `scripts/fetch.js` + `npm run fetch`: fetches each assembly's entry pages. Needs `POLIC_CONTACT` in `.env` (see `.env.example`).

### Step 3 — Adapters (facts only)
- [x] Shared helpers (`scripts/lib/text.js`, `pdf.js`, `html.js`, `bills.js`): strip spaces between CJK characters, normalize kanji and full-width numerals, parse 令和 dates, status/stage rules, bill ids.
- [x] `src/lib/config/committees.js`: hardcoded ja/en committee names and 所管局 → committee (Tokyo) and 部 → committee (Shibuya) mappings.
- [x] Suginami adapter: results table → facts (committee inline, vote date); split **every** 説明資料 PDF into per-bill sections (a session can have more than one).
- [x] Tokyo adapter: session page → facts; press release → category, 所管局 → committee, 概要 text; bill PDF → matched by the number printed in it (第百六十四号議案) and submission date; plenary schedule → whether committee referral has happened. No vote dates are published, so `date` stays the submission date. Official title comes from the assembly page (press uses short forms).
- [x] Tokyo member bills: **title-only** (decided 2026-09-28). No text is published, so no AI summary. Card shows title, status, date, 「議案の本文は公開されていません」 and the source link. Mark with `"titleOnly": true`; they still need reviewer approval.
- [x] Shibuya adapter: 議案等について page → facts + PDFs; 担当所管一覧 → committee; results PDF → status (position-based parsing). Only the current session is listed. No referral date is published, so pending bills stay at stage 0 until results arrive.
- [x] Scope filter: ordinances only (titles ending 条例), from the head or members. Member 意見書/決議 are excluded along with everything else that isn't an ordinance.
- [x] `scripts/lib/store.js`: write/update `data/<slug>/<id>.json` facts without touching reviewed text; sources refreshed only when facts change; `factsUpdated` when an approved bill's facts change. Source text → `cache/text/<id>.txt` (never committed).
- [x] `npm run collect` runs every adapter for every session in the config.
- [x] Tested against saved copies of the real pages (Tokyo 2nd+3rd, Suginami 2nd+3rd, Shibuya 3rd, Shibuya results via 2nd-session PDF).
- [ ] **First real run**: set `POLIC_CONTACT` in `.env`, run `npm run collect` off-peak, commit `data/`.

### Step 4 — Drafting
- [x] `scripts/lib/llm.js`: one `callJson` helper (Responses API, strict JSON schema, `store: false`), model id + prices in one place, cost report.
- [x] `scripts/draft.js` (`npm run draft [-- <id>…]`): for non-title-only bills with no `draft`, send facts + cached source text to `gpt-6-sol` at `high` effort; fill name, category, summary, changes, who, why; save with `"approved": false` and token usage. Redraft = delete the `draft` key.
- [x] Prompt rules (`scripts/lib/prompts.js`): only what the source says, own wording, neutral, no personal names (roles only), plain Japanese, half-width digits, `why` attributed to the proposer, `who` empty when residents aren't affected, dictionary-form `changes`.
- [x] Categories fixed in `src/lib/config/categories.js` (design's 7 + 6 more for real bills), enforced by the schema.
- [x] `stageNote` moved out of the LLM: the site will build it from facts (Step 6).
- [x] `scripts/translate.js` (`npm run translate`): for approved bills with missing or stale `en` (hash of the JA fields), translate at `low` effort; title-only bills get their official title translated so member bills aren't Japanese-only on English pages. Committee names come from the glossary, not the LLM.
- [x] `npm run update` = collect → draft → translate.
- [x] Tested on 6 real bills (incl. a 38k-char ordinance, a member bill, a sensitive topic): all numbers present in sources, longest verbatim run 10–18 chars (terms, not sentences), claims traced to the 説明資料. Cost: 6 drafts $0.17, 3 translations $0.009. Stale-English retranslation and skip-on-rerun confirmed.

### Step 5 — Review workflow
- [ ] First real run tonight: `npm run collect` (off-peak), then `npm run draft`, commit `data/`.
- [ ] `REVIEW.md` checklist: facts match the source, wording is new (not copied), neutral tone, no private names, caption readable.
- [ ] Reviewer edits JSON, sets `"approved": true`, commits.
- [ ] English reviewer checks `en` against the Japanese (not the source), sets `"en.approved": true`. Editing the Japanese makes the English stale and it gets retranslated.

### Step 6 — Site
- [ ] Build `stageNote` (ja/en) from stage/status/committee, e.g. 「保健福祉委員会で審議中です。」.
- [ ] Port the design's bill board (category chips, cards) and bill detail (summary, 何が変わる？, 自分にどう関係する？, 5-stop stepper, collapsed 出典) into Svelte components.
- [ ] Build step reads only `approved: true` bills.
- [ ] Every bill: source links, AI disclosure line, "report an error" mailto.
- [ ] Region picker covers the three pilot assemblies.
- [ ] `/en/` routes via `[[lang=lang]]`; UI strings in a small ja/en dictionary; language toggle switches the prefix.
- [ ] English pages use `en` only when `en.approved`; otherwise show Japanese with an "English coming soon" note.
- [ ] Board order per the Decisions table (pending → decided → no-direct-effect), ties by bill number.
- [ ] 「よく見られている」 strip from `popular.json` (threshold, hidden when empty, hidden during election freeze).
- [ ] Bill page sends the view beacon (`fetch('/v/<id>', { method: 'POST', keepalive: true })`) once per mount.
- [ ] Privacy policy page (incl. short-lived access logs for view counting, aggregates only).

### Step 7 — Launch
- [ ] Email each 議会事務局: what we crawl, rate, user-agent, contact.
- [ ] Deploy: build and copy `build/` to the VPS web root.
- [ ] Caddyfile:
  ```
  polic.example.jp {
  	root * /var/www/polic
  	try_files {path} {path}.html {path}/index.html
  	file_server
  	encode zstd gzip
  	log views {
  		output file /var/log/caddy/views.log {
  			roll_keep_for 14d
  		}
  	}
  	handle /v/* {
  		log_name views
  		respond 204
  	}
  }
  ```
  (`log_name` needs Caddy ≥ 2.8; check the VPS version and test the log routing before launch.)
- [ ] `scripts/popular.js` + nightly cron: read `views.log`, count unique hashed visitors per bill per day over 14 days, write `data/popular.json`, rebuild.
- [ ] Add the election-period freeze dates (April 2027) to the review checklist.

---

## Later (not v1)
- Budgets (need a readable source beyond the total).
- Per-faction votes (会派別賛否): source-parsed only, neutral grid.
- Admin review page if non-developers join as reviewers.
- Meeting summaries (会議).
- More assemblies.
