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
| Hosting | SvelteKit on **adapter-node**, run by pm2 on the VPS at `127.0.0.1:3005` behind **Caddy**. Every page is still prerendered at build time; the Node server only serves them (no API). Changed from static files 2026-09-30 to match the other apps on the VPS. |
| Storage | One JSON file per bill in `data/<assembly>/<bill-id>.json`. Git history is the audit trail. No database. |
| Review | **Tiered** (decided 2026-09-29; one reviewer can't read every bill). No admin UI. `npm run verify` runs code checks + an AI checker (`gpt-6.1-sol`, medium) on each draft. Bills go live **unchecked but labelled** when they pass; **held** for human review: member bills with AI summaries, any code flag, any AI issue except "omission" notes, and everything in an election window. ~1 in 10 live bills is a spot-check sample. Reviewer sets `"approved": true` → 「人が確認済み」. Logic in `scripts/lib/publish.js`. The legal briefing requires human review only for summaries mentioning candidates (election protocol); reviewing every bill was our stricter rule. |
| Pipeline | One command, `npm run update`, run by hand during sessions (or one weekly cron). |
| Session dates | Hardcoded in `src/lib/config/assemblies.js` (~4 sessions/year per assembly). |
| LLM | **OpenAI API, two models** via the official `openai` npm SDK, ids and prices in `scripts/lib/llm.js`. **`gpt-6-luna`** ($0.10 / $0.50 per 1M in/out) drafts and translates, both at **`high`** effort; **`gpt-6.1-sol`** ($2 / $10, $0.10 cached input) runs the AI check at `medium`. Decided 2026-09-30 to cut the 令和8年 backfill for the easiest nine wards from ~$10 to ~$3.50: the check is the safety net, since any issue it finds holds the bill for a person, so the stronger model goes there. Before that (2026-09-28) `gpt-6-sol` did everything; the 101 bills drafted then keep that in their metadata. Log reasoning tokens in each bill's `draft` metadata. Only writes the plain-language fields and English translations. Key in `.env` as `OPENAI_API_KEY`. |
| Bill scope | Resident-facing only: ordinances (条例) and member bills (議員提出議案). Skip budgets (decided 2026-09-28: only the total is parseable), contracts, reports, lawsuits, 諮問, settlements, appointments. |
| Votes | No per-faction votes (会派別賛否) in v1. Show result only. |
| Corrections | `mailto:` "report an error" link on every bill. |
| English | Translated from **our approved Japanese summary**, never from source documents (translation is a copyright-holder right, Art. 27). Separate `en.approved` flag; until then English pages show the Japanese with an "English coming soon" note. Decided 2026-09-28. |
| English URLs | `/en/` prefix (`/en/tokyo/bills/x`), both languages prerendered. SvelteKit optional `[[lang=lang]]` route param. |
| Fixed terms | Committee names, assembly names and status/stage labels come from a hardcoded glossary, never the LLM. Official titles are LLM-translated and labelled "unofficial translation". |
| Bill order | Facts only, never an LLM "importance" ranking (neutrality). (1) Still being decided (提案中/審議中), current session, soonest vote first; (2) decided (決定/否決), newest first; (3) bills with an empty `who` (no direct effect on residents) last. Ties by bill number. Decided 2026-09-28. |
| Popular bills | 「よく見られている」 strip above the board, separate from the main order (no feedback loop). A bill shows only with **≥ N unique visitors in the last 14 days** (start N = 30); if none qualify the strip is hidden. Counts are never displayed. Off during the election freeze. Decided 2026-09-28. |
| View counting | No new server: the bill page fires one beacon request (`/v/<bill-id>`) that Caddy answers `204` and logs; a nightly script counts unique (hashed IP + UA, per bill, per day) views from the log, writes `popular.json`, and rebuilds. Beacon, not page loads, because SvelteKit navigates client-side and preloads on hover. Caddy logs kept 7–14 days; only aggregates stored. Decided 2026-09-28. |
| Region scope | **Kanto only** for the near future (茨城・栃木・群馬・埼玉・千葉・東京・神奈川). New assemblies come from there: the 23 wards first, then Tokyo cities and other Kanto cities (Tama area checked 2026-09-30, see "Tama area: source check"). The home page region search lists only Kanto (`SEARCH_PREFECTURES` in `src/lib/config/site.js`; town list from 総務省's code list via `npm run municipalities`). Decided 2026-09-30. |
| Permission | Not legally required for this design. **Notify** each 議会事務局 before crawling; don't wait for a reply. |

## Non-negotiables (from the legal briefing)

These stay no matter how much we simplify:

1. **Polite fetching**: at most 1 request every 5–10s, off-peak, respect robots.txt, identifying user-agent with contact email, only fetch listed pages/PDFs (no search forms, no URL guessing), stop on any error or slowdown.
2. **Facts are parsed, never generated**: official title, number, status, dates, committee, stage come from the source by code. The LLM never writes these.
3. **New wording only**: summaries restate facts in our own words. Never copy or closely paraphrase explanatory prose (条例案概要, 議案説明資料 are likely copyrighted).
4. **Human review where it matters, labels everywhere else**: member bills, flagged bills and anything in an election window need approval; other bills go live after automatic checks, labelled 「AIが作成した要約です。まだ人が確認していません。」 with the source link.
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

## Next six: source check (2026-09-28, evening, read-only)

robots.txt allows us on all six hosts (checked through our polite fetcher). Shinjuku's site redirects English-language browsers to a machine-translation proxy (`j-server.com`); our crawler sends no `Accept-Language`, so it gets Japanese.

| Assembly | Bill list + results | Committee | Bill content | Verdict |
|---|---|---|---|---|
| 世田谷区議会 | **HTML table per session**: 番号, 件名, 付託先, 議決日, 結果 (`city.setagaya.lg.jp/02030/35744.html`, linked from `/gikai/index.html`). | In the table. | One PDF per bill on a 議案一覧 page per session (`/02252/35916.html`), sessions back to R5. No separate explanation doc found yet (maybe in committee materials). | **Easiest.** Like Suginami, but content as thin as Shibuya's. |
| 大阪市会 | **HTML table per session** (`/contents/wdu260/result/202605.html`): 番号, 件名 (linked to bill PDF), 付託日+委員会, 委員会結果+日, 本会議結果+日, plus 会派別賛否. | In the table (abbreviated: 財/教/民/都/市/建). | Bill PDF linked from each row (`/result/pdf/2026gian95.pdf`). | **Easiest.** Richest facts of all nine; votes ignored in v1. |
| 新宿区議会 | Session page lists bills by kind (条例/予算/その他, 区長 vs 議員) (`/kusei/file08_05_...html`); results in one PDF 「議案の概要と審議結果」. | Probably in the results PDF (to check). | **Per-bill PDFs + 「提出案件概要」 PDF** (a summary for each bill, like Suginami's 説明資料) on `/kusei/kuseijoho01_001109_02.html`. Member-bill text not found yet. | **Good.** Rich content; results need PDF parsing. |
| 名古屋市会 | **HTML table per session**: 議案番号, 案件名, 提出年月日, 付議委員会, 議決年月日, 議決結果 (`/shikai/shingi/1030858/1030859/1052671.html`); member bills on a sibling page. | In the table. | **Not found.** Finance bureau posts budget bills only. 市会だより has per-bill 賛否. | Facts easy, content missing → title-only unless we find the 議案書. |
| 大阪府議会 | One **PDF (+ .doc)** per session 「提出議案・議決結果」 (`/o170010/gikai_somu/gian0806.html`). | Probably in the PDF (to check). | Member bills in full (PDF + docx incl. 提案理由). Governor bill PDFs exist under `pref.osaka.lg.jp/documents/…` (e.g. `tiji4.pdf`, linked from the 府政記者会 press site); listing page not found yet. | Medium: PDF parsing for facts; content findable. |
| 愛知県議会 | **HTML table per session**: 議案番号, 議案名, 付託委員会, 議決結果 with date (`/site/gikai/nittei-0806.html#gian`), index at `/site/gikai/kekka-gaiyo.html`; also a PDF of 会派別態度. | In the table. | **Not found online.** Only the governor's 提案説明要旨, 議会ニュース and 県議会だより (text files); the NDL holds printed 議案書. | Facts easy, content missing → title-only or 議会ニュース summaries. |

**Scope filter change needed:** Aichi and Nagoya title ordinances 「…条例の一部改正について」 / 「…条例の制定について」, Osaka City 「…条例案」. `inScope()` must match 条例 before those endings, and still exclude 専決処分報告 (Osaka City lists 「…条例急施専決処分報告について」).

**Proposed build order:** 世田谷区 → 大阪市 → 新宿区 → 大阪府 → 名古屋市 → 愛知県. Before building Nagoya and Aichi, ask each 議会事務局 (in the crawl notice) where the 議案書 is published; if it isn't, their bills are title-only like Tokyo member bills.

## Six more wards: source check (2026-09-29, read-only, in a browser)

robots.txt allows us on every host we'd use (details below). Chiyoda's and Shinagawa's city sites redirect English-language browsers to the `j-server.com` translation proxy, like Shinjuku; our crawler sends no `Accept-Language`, so that shouldn't affect it.

| Assembly | Bill list + results | Committee | Bill content | Verdict |
|---|---|---|---|---|
| 港区議会 | **Bill database** on `gikai2.city.minato.tokyo.jp`: `g07_giketsu.asp?kaigi=…&kensu=100` lists 番号, 件名, 議決日 + 結果 per session (back to H14); `bunrui` filters 区長報告/議案/議員提出議案. | On each bill page (`g07_Giketsu_View.asp?SrchID=3592`). | Each bill page has a one-line 概要, plus **概要 PDF and 本文 PDF** (`/voices/GikaiDoc/attach/Gk/GkB856_69.pdf`), and 各会派の態度. | **Easiest of all twelve.** Richer than Suginami. Pages are Shift_JIS. |
| 品川区議会 | **One HTML page per session** (`gikai.city.shinagawa.tokyo.jp/katsudou/honkaigi-schedule/r08_03t/r08_03t1`): 番号, 件名, a detailed 内容 (before/after amounts, 施行期日), 結果. Per-member votes as a PDF. | Not on that page (in 各委員会の予定・結果, to check). | **Bill PDF (+ .doc/.docx) per bill** (`/wp-content/themes/shinagawakugikai/pdf/r08_03t_85.pdf`). | **Easiest** (tied with Minato). The 内容 column is almost a 説明資料. |
| 目黒区議会 | 資料 page per session with **one PDF per bill** (`/kugikai/kusei/kugikai/r8-2teirei-siryo.html` → `/documents/20430/8-46.pdf`); **HTML results table** per session (`8-2teirei-giketukeka.html`). | Session page (`r8-3teirei.html`) lists bills by committee, by title only. | Bill PDFs (kept online for 2 years). No explanation doc. The R8 第3回 資料 page isn't up yet (session ends 9/30). | **Easy.** Like Setagaya. Committee needs matching by title. |
| 中央区議会 | Results per session in HTML (`/honkaigi/r08/teirei-0802.html`): title, one-line summary, result + 会派 votes, **but no bill numbers** (match by title). | Committee-meeting pages (`/calendar/r08/bunkyo_20260928.html`) list 付託議案 by number. | **Bill PDF + committee 資料 PDF** linked from each committee-meeting page (Japanese filenames under `/shiryo/r8/●議案資料/第三定/…`). | **Good.** Rich content, but the parser has to walk meeting pages. |
| 練馬区議会 | **HTML table per session** (`/gikai/kaigi/r8/dai3teirei/0803gian.html`): 番号, 件名, 付託委員会, 結果, plus a short 内容 paragraph (what changes, 施行日). Separate 議決された議案 page with votes. | In the table. | Only that paragraph. No bill PDFs on the site. Committee materials are on a third-party system (`discusscabinet.net/nerima/`, not checked). | **Facts easy, content thin.** Like Shibuya: summaries from one paragraph. |
| 千代田区議会 | Results as **one PDF per session** (`gikai-chiyoda-tokyo.jp/kaigi/kekka/files/20262teikekka.pdf`). Bill list + grouped one-line 概要 in the ward's **press release** at session start. | Committee PDFs (to parse). | No bill text found. Committee 資料 PDFs (2–16 MB, `/katsudou/docs/20260703bunkyoushiryou.pdf`) contain per-bill explanations, posted up to 2 weeks after each meeting. | **Hardest of the six.** PDF parsing everywhere, content arrives late. Site renewed 2026-09-01, so URLs may still move. |

**robots.txt:** Minato (`gikai2`) disallows only video and cgi paths; Nerima disallows many city sections but not `/gikai/`; Chiyoda's city site disallows a few unrelated paths; Shinagawa allows all; Meguro, Chiyoda's assembly site and Minato's `www.gikai` host have none (404). **Chuo** names AI crawlers (GPTBot, ChatGPT-User, ClaudeBot, …) and SEO bots with `Disallow: /`, has no `User-agent: *` group, and ends with path rules for `/*?`, `.cgi` and `.php`. PolicBot isn't named, so it's technically allowed, but the intent is to keep AI tools off the site. Decide before building Chuo; asking the 議会局 in the crawl notice is the clean option.

**Watch:** Minato's `www` hosts took over 10 s to load in the browser; our fetcher stops a host after 10 s. The bill database host (`gikai2`) responded normally.

Build order: superseded by "All 23 wards by difficulty" below.

## Remaining 13 wards: source check (2026-09-29, read-only, in a browser)

robots.txt allows us everywhere below: only cgi, video, 工事送達 or translation-proxy paths are disallowed, or there's no robots.txt at all. None names AI crawlers the way Chuo's does. Adachi's and Edogawa's assembly sites redirect English-language browsers to `j-server.com`, like Chiyoda and Shinagawa.

| Assembly | Bill list + results | Committee | Bill content | Verdict |
|---|---|---|---|---|
| 江戸川区議会 | **Same bill database as Minato** (`gikai.city.edogawa.tokyo.jp/g07_giketsu.asp?smode=3&kaigi=…&kensu=100`). The list itself has number, title + one-line 概要, result with the vote count per 会派, and committee. | In the list. | 本文 PDF per bill. | **Easiest.** |
| 足立区議会 | **Same bill database** (`gikai-adachi.jp/g07_giketsu.asp`). | On each bill page. | 本文 PDF per bill (`/voices/GikaiDoc/attach/Gk/…pdf`); no 概要 PDF. | **Easiest.** |
| 墨田区議会 | **One HTML page per meeting** (`/kugikai/kaigi_info/teireikai/2026/R89gatugian.html`): number, title, 付託委員会, 結果; member bills too. | In the table. | Bill PDF + **新旧対照表** and sometimes a **概要** PDF per bill. | **Easiest.** Year-long session: meetings are named 「令和8年度定例会9月議会」 and bill numbers restart each fiscal year. |
| 台東区議会 | Session page (`/kugikai/kaigi/honkaigi/r8/r8tei3/08-dai3kai-gian.html`): number, title, 提出者, one-line 内容. **HTML results page** per sitting day with committee assignment and 全員賛成 etc. | Results page. | PDF per bill (`08-dai3kai-gian.files/8-3-79.pdf`). | **Easiest.** |
| 中野区議会 | **HTML list per year** (`kugikai-nakano.jp/honkaigi.html?nen=2026&gian_id=121`): number, title, short 内容, committee, 議決日 + result. | In the list. | PDF per bill (`/gian/2691113731.pdf`). | **Easiest.** Separate assembly site. |
| 葛飾区議会 | **HTML 議案一覧・付託表** per session (`katsushika-kugikai.jp/30205.html`): number, title, committee, 概要. Results on `30305.html`. | In the table. | PDF per bill (`/pdf/R8gian58.pdf`, listed on `60581.html`). | **Easiest.** Full-width digits in titles. |
| 大田区議会 | **HTML table per session** (`/gikai/kugikai_katsudou/honkaigi/r_8/2teirei/r0802teirei_kuchogian.html`): number, title, 議決日, 結果 (全会一致/賛成者多数), committee. Member bills on a sibling page. | In the table. | Bill text in **grouped PDFs** (「第59号議案から第66号議案」), so they need splitting by 議案 number. | **Easy.** Like Suginami. |
| 板橋区議会 | **HTML 審査状況** per session (committee, merged rows); results as one **PDF** per session. | HTML. | **PDF per bill** (`r80918_hon_69.pdf`). | **Easy.** |
| 文京区議会 | Bills: **one combined PDF** per session (「議案第33～52号」). Results: one PDF per session with per-member votes. | Committee pages (not checked in depth). | Combined PDF, to split by 議案 number. | **Medium.** Sessions are named by month (「令和8年9月定例議会」). |
| 江東区議会 | Results: **PDF** per session. Committee agendas as PDFs (`081005kikakusoumu.pdf`). | Agenda PDFs. | No bill text found. Committee 資料 as one PDF per bill, but posted only after the committee meets. | **Medium.** Content arrives late. |
| 荒川区議会 | HTML bill list per meeting; **HTML results table** with 会派 votes; one HTML page per passed bill with its **提案理由** paragraph. | Not found. | No bill text; only that paragraph. | **Thin**, like Nerima. Year-long session (「令和8年度定例会・9月会議」); numbers restart each fiscal year. |
| 豊島区議会 | HTML results per session (grouped by outcome) and HTML committee pages listing 付託議案. | HTML. | **Not found.** | **Facts only.** Title-only, like Tokyo member bills, unless we find the 議案書. |
| 北区議会 | 議決した議案等: a **scanned PDF with no text layer** (OCR needed), posted after the session. Session summary page in HTML. Materials on a third-party system (`discusscabinet.net/kitakugikai/`). | Not found. | Not found. | **Hardest**, with Chiyoda. |

**One adapter, three wards:** Minato, Adachi and Edogawa run the same bill database (`g07_giketsu.asp` / `g07_Giketsu_View.asp`, Shift_JIS, same robots.txt template). Building it once covers all three.

**Session naming:** `parseSessionName` handles Sumida's year-long session (「令和8年度定例会9月議会」 → fiscal year + month, id `sumida-r8-9-16`; numbers restart each fiscal year). Still to add: Arakawa 「令和8年度定例会・9月会議」 and Bunkyo's month names (「令和8年9月定例議会」).

## All 23 wards by difficulty

| Tier | Wards |
|---|---|
| Easiest: bill text per bill + facts in HTML | 港区, 足立区, 江戸川区 (one shared adapter) · 品川区 · 墨田区 · 台東区 · 中野区 · 葛飾区 · 世田谷区 (all built 2026-09-30) · 杉並区 (live) |
| Easy: one extra step (split PDFs, results in PDF, match by title) | 大田区 · 板橋区 · 目黒区 · 新宿区 |
| Medium | 文京区 · 江東区 · 中央区 (robots.txt question first) |
| Thin: a paragraph or facts only | 渋谷区 (live) · 練馬区 · 荒川区 · 豊島区 |
| Hard | 千代田区 · 北区 |

**Proposed build order:** the g07 adapter (港区, 足立区, 江戸川区) → 品川区 → 墨田区 → 台東区 → 中野区 → 葛飾区 → 世田谷区 (done: all 令和8年 sessions, before soft launch) → 大田区 → 板橋区 → 目黒区 → 新宿区, then the medium and thin ones.

**Easiest nine, as built (2026-09-30).** All tested offline against saved pages (`cache/research/<ward>.json`, `node scripts/try.js <id>`); none has had a real crawl yet.

| Ward | Bills from | Committee | Result / date |
|---|---|---|---|
| 港区, 足立区, 江戸川区 | g07 bill database (`g07.js`) | Bill page or list | Vote date |
| 品川区 | 提出議案 page per session; 内容等 → 概要 | Current 委員会 pages (May–May, so earlier sessions get none) | Result only; date = submission |
| 墨田区 | One page per 「…月議会」 | Abbreviated, spans rows | Result only; date = submission |
| 台東区 | 提出された議案 page | 会議結果: 「…委員会」に付託 | Vote date from the sitting-day heading |
| 中野区 | Year page → session (`gian_id`) | Abbreviated | Vote date in the result cell |
| 葛飾区 | 議案一覧・付託表 + 議案 PDF index (Shift_JIS) | 付託表 | Vote date from the text above each results table |
| 世田谷区 | 議案一覧 (ward bills only) | 賛否一覧 (closed) or 審議予定案件 (open) | 議決内容 date (closed) or 議決日 (open); member bills title-only |

Upkeep: 墨田区, 台東区 and 中野区 list pages per (fiscal) year, so add the next year's index to `listPages` when it starts. 葛飾区's 第1回定例会 opening day is unconfirmed (its schedule PDF is a scanned image); 2026-02-16 is its first recorded vote. **品川区長選挙 is on 2026-11-15**, during soft launch: the election window rule covers assembly elections only, so decide whether a mayoral election should also hold unreviewed bills.

## Tama area: source check (2026-09-30, read-only, in a browser)

The 26 cities plus 瑞穂町, 日の出町, 檜原村 and 奥多摩町; the islands are out of scope. One or two sessions checked per assembly. **robots.txt allows us everywhere** (cgi, mobile or translation paths only, or no robots.txt at all); 町田 disallows named SEO bots and CCBot, not `*`. 立川 and 東村山 redirect English-language browsers to `j-server.com`, like the wards.

| Assembly | Bill list + results | Committee | Bill content | Verdict |
|---|---|---|---|---|
| 町田市議会 | **Same g07 bill database as Minato/Adachi/Edogawa** (`gikai-machida.jp/g07_giketsu.asp`); sessions 「令和8年9月定例会（第3回）」. | Bill page (議案のカルテ). | 本文 PDF per bill + 議案の概要. City open data also has a 議案審議結果一覧表 XLSX. | **Easiest**: `g07.js` + config. |
| 立川市議会 | 議案一覧 page per session (`/shigikai/katsudo/1007184/1026374/1026377/1028161.html`): 番号, 議案名, 付託委員会 (or 付託省略), 議決年月日・結果. | In the table. | PDF per bill (`r8gian108.pdf`; 決算 grouped). | **Easiest.** New assembly elected 2026-06-21. |
| 武蔵野市議会 | Year page of 市長提出議案 (`/shigikai/gian_seigan_chinzyo/shichogian/1053667.html`), a table per session: 番号, 件名, 付託委員会, 委員会 date/result, 本会議 date/result. 議員提出議案 on a sibling page. | In the table (abbreviated). | PDF per bill (`/shiseijoho/reiki_sosho_gian/shigikai_teishutsugian/1054952.html`), plus per-session press-conference 概要. | **Easiest.** |
| 青梅市議会 | 議案審議結果一覧 per meeting (`/site/gikai/120709.html`): 番号 (議2), 件名 → PDF, **one-sentence 議案概要**, 提出日, committee + date + result, 議決日 + result. | In the table. | PDF per bill. | **Easiest, and the richest.** Year-long session: 「令和8年市議会定例会」 runs May–April, meetings 「5月招集議会」「6月定例議会」…; numbers restart each May. |
| 府中市議会 | 議決結果 page per session (`/gikai/shingi/naiyo/r8dai2kaigiketukekka.html`): 番号, 件名, 付託委員会, 本会議結果, **plus a CSV** of the same. No vote date. | In the table (本会議直接審議 = none). | PDF per bill (`…/r8sicyotesyutu/2teirei.files/8-2-044.pdf`). | **Easiest.** Date = submission, like Sumida. |
| 調布市議会 | 会議結果 page per session (`/140010/p077273.html`): a list, not a table: 「41.title / 付託委員会: / 議決年月日: / 結果:」. | In the list (即決 = none). | PDF per bill on 市長提出予定議案 (`/020040/p078144.html` → `/documents/17475/gian36.pdf`), plus a yearly 補足・説明資料 page. | **Easiest.** |
| 東村山市議会 | 議案一覧 per session (`/gikai/katsudo/gikai_09_gian-kekka/r8/8-9shichougian.html`): 番号, 件名 → PDF + one-line 提出理由, 付託日, committee, 結果 (no vote date). | In the table. | PDF per bill (`r8-56g.pdf`). | **Easiest.** Sessions named by month (「令和8年9月定例会」). |
| 東大和市議会 | 議案等審議結果 per session (`/shisei/gikai/1008119/1005679/1011960/1012285.html`): 上程日, 付託日, 付託先 (省略), 議決日, 結果. | In the table. | PDF per bill on 市長提出議案 per session (`…/1011940/1012223.html` → `4-35.pdf`). | **Easiest.** Separate series: 第35号議案, 第1号同意, 第2号報告. |
| 瑞穂町議会 | 議案件名 page per session (`/gikai/result/001/r8/p011439.html`): 番号, 件名 → PDF, 結果. | Not shown. | PDF per bill. | **Easiest** (no committee or vote date). |
| あきる野市議会 | One page per 会議 (`/0000020596.html`, index `/0000000464.html`): 番号, 件名 → PDF, 採決日, 結果. | Not in the bill table. | PDF per bill. | **Easiest** (no committee). Year-long session with 会議: 「令和8年第1回定例会6月定例会議」「…第1回臨時会議」. |
| 八王子市議会 | Session page (`/contents/shigikai_1/gikainokatudou/honnkaigi/reiwa8/p037524.html`): 番号, 件名, 付託委員会 (abbreviated, legend below), 委員会 date, 議決年月日, 結果. Member bills as PDFs. | In the table. | **Combined** 議案 PDF + **議案の概要** PDF per session (`/shisei/001/001/007/002/p037536.html`), back to H29. | **Easy**: split the combined PDF. Titles 「…条例設定について」. |
| 三鷹市議会 | 本会議の結果 per session (`gikai.city.mitaka.tokyo.jp/activity/result/2026/custom_2026b.html`): 上程日, 付託日 + committee (or 即決), 審査結果, 議決日 + result (満場一致/賛成多数). | In the table. | **Combined** 提出議案 PDF per send date; the city's 議案概要等 page has 概要 PDFs. | **Easy.** |
| 小平市議会 | 議決した議案 per session (`/gikai/129/129115.html`): 提出年月日, 付託先, 議決年月日, 結果. | In the table. | **Combined** 議案 PDF on a press-release page per session (`/kurashi/128/128505.html`). | **Easy.** Sessions named by month. |
| 東久留米市議会 | 会議結果 per session (`/gikai/kaigi/kekka/1028663/1028668.html`): 議決日, 結果, votes by 会派. 付議案件 page: 付託先. | 付議案件 page. | **Combined** 議案 PDF (4.9 MB) + 議案一覧表 PDF. | **Easy.** |
| 稲城市議会 | **One page per session** (`/gikai/ugoki/1013693/1013956.html`) with everything: 議案番号, 議案名, 審議方法, 議決年月日, 結果, per-committee sections. | In the table. | **Combined** 議案書 PDF (13.6 MB). | **Easy.** |
| 多摩市議会 | 会議結果 per session (`/shigikai/kaigi/kekka/1019561/1020428.html`): 提出月日, 議案名, 議決月日, 結果. | Not found. | PDFs **grouped by number range** (「第79号議案から第104号議案まで（契約・損害賠償・条例等）」). | **Easy** (no committee). Site slow (one load > 10 s). |
| 国立市議会 | 会議結果報告 **PDF** per session; session page (`/soshiki/Dept09/Div01/Sec02/gyomu/gikai_kaigi_nittei_kekka/0304/r8/13705.html`). | 付託事件一覧表 PDF. | **PDF per bill** (`/shisei/gikai/5/r8_1/13780.html`). | **Easy/medium**: text easy, facts in small PDFs. Titles end 「…条例案」. |
| 狛江市議会 | Results as **PDFs** (審査結果一覧 + 賛否一覧表, `/index.cfm/49,145713,404,2590,html`). | 「提出議案及びその取り扱い」 PDF. | **Combined** 議案 PDF in a news post per session (`/index.cfm/49,145796,594,html`). | **Medium**: all PDF, timestamp filenames. |
| 国分寺市議会 | Results as one **PDF** per session; 付議事項 HTML list. Site renewed 2026-03-03 (old URLs 404). | 委員会審査結果 pages (not checked). | 提出議案一覧 in HTML with a **提案理由** paragraph per bill; no bill PDFs seen. | **Medium/thin.** |
| 清瀬市議会 | Results as **PDFs** per session (`/sigikai/kaigi/1015946/1016286.html`) with 議案名, **概要**, 議決日, 結果. | Not seen. | 議案一覧 pages appear during a session and are **removed afterwards**. | **Medium/thin**: text only if captured while open. |
| 福生市議会 | 審議結果 per session (`/assembly/meeting/bill/1020868/1021548.html`): per bill 付託年月日・委員会, 議決年月日・結果, **内容** paragraph. | In the page. | No bill PDFs. | **Thin**, like Nerima. |
| 羽村市議会 | Year page of 市長提出議案 (`/0000020396.html`): 番号, 件名, **要旨** (reason, 【主な内容】, 【施行日】), 結果 + date. | Not found. | No bill PDFs; the 要旨 is detailed, like Shinagawa's 内容. | **Thin but rich.** |
| 日野市議会 | 議案等審議結果一覧表 per session (`/shigikai/gian/1030502.html`): votes by 会派, 結果, 議決年月日. | Not found. | Not found. | **Facts only.** |
| 西東京市議会 | 日程・付議案件・結果 per session (`/sigikai/nittei_kekka/nittei_anken/r8/kaikinainittei0801.html`): 上程月日, 付託委員会, 結果. | In the table. | Member bills (意見書) only. | **Facts only.** |
| 昭島市議会 | 審議結果 per session (`/gikai/honkaigi/1006709/1011604/1012026.html`): 議決月日, 結果. | Only on the 直前情報 page for the current session, overwritten each time. | Not found. | **Facts only**; committee must be caught while open. |
| 日の出町議会 | 議案結果 per session (`/0000004700.html`): a list with 審議結果 and sometimes 「…委員会に付託（2月27日）」. | When referred. | Not found. | **Facts only.** |
| 武蔵村山市議会 | 議決結果 for the **latest session only** (`/shisei/shigikai/1022404/kaigi/1022506.html`); last year's page now 404s. | Not found. | Not found. | **Facts only, transient**: must be collected every session. |
| 小金井市議会 | Results as **PDFs** per session. | Probably in the PDF. | **Scanned bundles with OCR** per send date (当初送付案件 129 MB). | **Hard.** |
| 檜原村議会 | **No bill list or results online**: schedule, 一般質問, video and 議会だより only. | — | — | **Not feasible** (newsletter only). |
| 奥多摩町議会 | **No bill list or results online**: schedule, 一般質問, 会議録 and 議会だより only. | — | — | **Not feasible** (newsletter/minutes only). |

**By difficulty**

| Tier | Assemblies |
|---|---|
| Easiest: bill text per bill + facts in HTML | 町田市 (g07) · 立川市 · 武蔵野市 · 青梅市 · 府中市 · 調布市 · 東村山市 · 東大和市 · 瑞穂町 · あきる野市 |
| Easy: split a combined PDF, or facts in small PDFs | 八王子市 · 三鷹市 · 小平市 · 東久留米市 · 稲城市 · 多摩市 · 国立市 |
| Medium: everything in PDFs, or text only while open | 狛江市 · 国分寺市 · 清瀬市 |
| Thin: a paragraph per bill | 福生市 · 羽村市 |
| Facts only (title-only) | 日野市 · 西東京市 · 昭島市 · 日の出町 · 武蔵村山市 |
| Hard | 小金井市 |
| Not feasible now | 檜原村 · 奥多摩町 |

**Shared work before building:**
- **Combined PDFs** (八王子, 三鷹, 小平, 東久留米, 稲城, 多摩, 狛江): one helper that splits a bundle at each 「第N号議案」/「議案第N号」 heading would cover seven assemblies.
- **Session names**: month-named sessions (小平, 東村山, 町田 「令和8年9月定例会（第3回）」), 青梅's May–April year (「…6月定例議会」, numbers restart in May) and あきる野's 「令和8年第1回定例会6月定例会議」 all need `parseSessionName` cases.
- **Scope filter**: titles ending 「…条例設定について」 (八王子), 「…条例の制定について」 (日野) and 「…条例案」 (国立) must count, while 専決処分 stays out.
- **Transient pages** (昭島 committee, 清瀬 bill text, 武蔵村山 results): they only work if we collect during every session, so crawl weekly while they're open.

**Proposed build order:** 町田市 (g07 config only) → the other nine easiest → the seven easy ones after the PDF splitter → medium, thin and facts-only as time allows. 檜原村 and 奥多摩町 wait until they publish bill lists; ask in the crawl notice.

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

  "draft": { "model": "gpt-6-luna", "effort": "high", "promptVersion": 1, "generatedAt": "…", "inputTokens": 0, "cachedTokens": 0, "outputTokens": 0, "reasoningTokens": 0 },

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
- [x] `scripts/draft.js` (`npm run draft [-- <id>…]`): for non-title-only bills with no `draft`, send facts + cached source text to `gpt-6-luna` at `high` effort; fill name, category, summary, changes, who, why; save with `"approved": false` and token usage. Redraft = delete the `draft` key.
- [x] Prompt rules (`scripts/lib/prompts.js`): only what the source says, own wording, neutral, no personal names (roles only), plain Japanese, half-width digits, `why` attributed to the proposer, `who` empty when residents aren't affected, dictionary-form `changes`.
- [x] Categories fixed in `src/lib/config/categories.js` (design's 7 + 6 more for real bills), enforced by the schema.
- [x] `stageNote` moved out of the LLM: the site will build it from facts (Step 6).
- [x] `scripts/translate.js` (`npm run translate`): for approved bills with missing or stale `en` (hash of the JA fields), translate at `low` effort; title-only bills get their official title translated so member bills aren't Japanese-only on English pages. Committee names come from the glossary, not the LLM.
- [x] `npm run update` = collect → draft → translate.
- [x] Tested on 6 real bills (incl. a 38k-char ordinance, a member bill, a sensitive topic): all numbers present in sources, longest verbatim run 10–18 chars (terms, not sentences), claims traced to the 説明資料. Cost: 6 drafts $0.17, 3 translations $0.009. Stale-English retranslation and skip-on-rerun confirmed.

### Step 5 — Review workflow
- [x] First real run (2026-09-28 evening): 109 bills collected, 101 drafted ($1.82), committed as `data/`.
- [x] `REVIEW.md`: the loop (review → edit JSON → `"approved": true` → commit), Japanese checklist (facts vs source incl. kanji numerals and swapped 新旧対照表, new wording, neutral, attributed `why`, no names, 西暦 dates, distinct headlines, `who` empty = sinks to bottom), title-only bills, `factsUpdated` rechecks, English checklist (against the approved Japanese), election-period rule, reader corrections.
- [x] `npm run review [-- <id filter>]`: read-only queue (Japanese to review, title-only, facts changed after approval, no draft, English to review, English out of date). No automated checks.
- [x] English staleness uses one shared hash (`jaSource()` in `scripts/lib/prompts.js`) for both `translate` and `review`.
- [x] Tiered review (2026-09-29): `scripts/lib/checks.js` (code checks), AI checker prompt v2 in `scripts/lib/prompts.js`, `npm run verify` (writes `checks` into each bill), `scripts/lib/publish.js` (reviewed / auto / held), `npm run review` rewritten around the held queue, `translate` covers live bills, `election` windows in `assemblies.js`. Tested on 15 bills: caught shibuya-r8-3-47 (garbled table), suginami-r8-2-45 (scope), tokyo-r8-2-126 (wrong amounts), tokyo-r8-1-68 (copied sentence).
- [ ] Run `npm run verify` on the remaining drafts (~$0.90–1.10).
- [ ] Prompt v2 for drafting (optional, ~$1.80 to redraft): 西暦 dates, distinct headlines for sibling bills, caution on 新旧対照表 direction.
- [ ] Fill in the 2027 ward-election notice date and election day in `REVIEW.md` once announced.

### Step 6 — Site
Built 2026-09-29 from the design reference. Pages: landing, one board per assembly, bill popup (also its own URL), search, About, privacy policy, 404, 学ぶ; 会議・参加する are 準備中 pages. Every page also under `/en/`.
- [x] `stageNote` (ja/en) built from stage/status/committee/date in `src/lib/bills.js`.
- [x] Board (category chips, paper cards with a fixed emoji per topic) and bill popup (summary, 何が変わる？, 誰に影響がある？ (left out when empty), なんで今？, 5-stop stepper with ? notes, collapsed 出典).
- [x] Every bill: source links, AI disclosure line, "report an error" mailto (address = `POLIC_CONTACT`, public).
- [x] Build includes only bills where `publishState()` is `reviewed` or `auto` (`src/lib/server/data.js`); internal fields (`checks`, `draft`, hashes) are stripped. Labels: 「AIが作成し、人が確認した要約です。」 / 「AIが作成した要約です。まだ人が確認していません。正確な内容は原文をご確認ください。」; title-only bills say the text isn't published.
- [x] Board shows a subtle count of held bills (「ほかに確認中の議案がN件あります。」), no titles.
- [x] Region picker lists the three pilot assemblies.
- [x] `/en/` via `[[lang=lang]]`; UI strings inline as `t('日本語', 'English')`; footer link switches language; `<html lang>` set per page.
- [x] English: shown whenever it matches the current Japanese (`sourceHash`), labelled "not yet checked by a person" unless `en.approved` (per REVIEW.md); otherwise the Japanese with "English coming soon".
- [x] 定例会: short label on each card; inline in the popup's meta row with an ⓘ note (dates, 開会前/開会中/閉会 as of the build date).
- [x] Popup: title + close pinned; official title, meta row, 定例会 and disclosure above the thick divider; the divider moves under the title once scrolled. Opening from the board uses shallow routing (URL changes, back closes it); a direct visit shows the board with the bill open.
- [x] Board header lists the 定例会 we cover (開会中 on the open one) and the coverage sentence.
- [x] Board order per the Decisions table. Bills with no date (Tokyo member bills) sort by their session's opening date.
- [x] 「よく見られている」 strip from `data/popular.json` (`{ "visitors": { "<bill id>": <unique visitors, last 14 days> } }`), ≥ 30, top 5, hidden when empty or in an election window.
- [x] Popup sends the view beacon once per bill shown (skipped in dev).
- [x] Privacy policy page (`/privacy`): no cookies/analytics, access logs ≤ 14 days, aggregates only, OpenAI (US) named. **Draft: check against the legal briefing before launch.**
- [x] 学ぶ (2026-09-30): 11 hand-written explainers in `src/lib/learn.js` (ja/en), grouped 地方自治のしくみ (二元代表制, 首長と役所, 議会と議員, 都と23区, 住民ができること) and 議案と議会 (flow matching the stepper, 委員会, 本会議, 定例会と臨時会, 条例, 議案を出す人). Index + `/learn/<slug>` with 「次を読む」; stepper ? notes link to 委員会 and 本会議. **Needs a read-through against 地方自治法 before launch.**
- [x] Search (`/search?q=`): substring match over live bills after NFKC + lowercase (全角/半角 insensitive), all words must match.
- [x] Fonts self-hosted (`@fontsource`): no third-party requests.

### Step 7 — Launch
- [ ] Email each 議会事務局: what we crawl, rate, user-agent, contact.
- [ ] Deploy on the VPS: clone the repo, put `POLIC_CONTACT` in `.env` (read at build time), then `npm ci && npm run build && pm2 start ecosystem.config.cjs`. Updates: `git pull --ff-only && npm ci && npm run build && pm2 restart polic`.
- [ ] Caddyfile:
  ```
  polic.example.jp {
  	log views {
  		output file /var/log/caddy/views.log {
  			roll_keep_for 14d
  		}
  	}
  	handle /v/* {
  		log_name views
  		respond 204
  	}
  	reverse_proxy 127.0.0.1:3005
  }
  ```
  (`log_name` needs Caddy ≥ 2.8; check the VPS version and test the log routing before launch.)
- [ ] `scripts/popular.js` + nightly cron: read `views.log`, count unique hashed visitors per bill per day over 14 days, write `data/popular.json` (format in Step 6), rebuild, `pm2 restart polic`. The nightly rebuild also keeps session states and the election window current.
- [ ] Add the election-period freeze dates (April 2027) to the review checklist.

---

## Later (not v1)
- Budgets (need a readable source beyond the total).
- Per-faction votes (会派別賛否): source-parsed only, neutral grid.
- Admin review page if non-developers join as reviewers.
- Meeting summaries (会議).
- More assemblies.
