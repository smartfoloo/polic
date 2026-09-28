# Subagent brief — ぎかいボード full website prototype

## The user's prompt, verbatim

> build the website with ur structure

"ur structure" refers to the site structure described below, which the user approved.

## Skill assignment (the ONE line that varies per column)

**{{SKILL_ASSIGNMENT}}**

(One of: "Invoke the `design-taste-frontend` skill by name and follow it." /
"Invoke the `hallmark` skill by name and follow it." /
"Use no skill — design with your own judgment only. This is the control version; do not
quietly borrow another skill's approach.")

## What this is

**ぎかいボード** is a volunteer-run, nonprofit civic project in Japan (an informal group, not a
registered NPO — never call it NPO法人). Its mission: make it easy for people who don't normally
follow local politics to understand what their **local assembly** (都道府県議会 / 市区町村議会) is
deciding. It started as a Tokyo-only bill tracker ("都議会ボード") and is expanding to:

- multiple local governments, chosen by region
- **meeting summaries**: turning multi-hour assembly / committee / school board (教育委員会)
  recordings and minutes (会議録) into short, searchable summaries with timestamped chapters that
  deep-link into the official video
- plain-language explainers on how local government works

It is inspired by みんなの国会 (minna-no-kokkai.com, national Diet tracker) but deliberately far
less cluttered: one clear thing per screen, plain language first, detail behind progressive
disclosure. The audience is ordinary residents, including people who have never looked at an
assembly website. Content is **Japanese**.

## Site structure (fixed — implement all of it)

Build it as a **single-page app in one `index.html` with hash routing** (`#/`, `#/tokyo`, …),
so every "page" works inside the one self-contained file. Back/forward must work; every bill and
meeting must have its own shareable hash URL.

```
#/                         Landing page
#/tokyo                    Region hub (default tab: 議案)
#/tokyo/bills/:id          Bill detail (may open as a modal over the board, but the URL updates)
#/tokyo/meetings           Meeting list
#/tokyo/meetings/:id       Meeting summary: timestamped chapters + in-meeting search
#/tokyo/shibuya            Municipal hub, same layout as a prefecture hub
#/search                   Search across bills AND meeting summaries/transcripts
#/learn                    Explainers (how a bill passes, what committees are, etc.)
#/about                    Mission, team (volunteers), how summaries are made, corrections policy
#/join                     Volunteer / contact + newsletter signup
```

### Global navigation
- Logo/site name, a **region pill** showing the current assembly (e.g. 「東京都議会 ▾」), then
  議案 · 会議 · 学ぶ, and About.
- On mobile, 議案 · 会議 · 学ぶ (plus search if you like) become a **bottom tab bar**.

### Region picking (maximum usability is the goal)
- Tapping the region pill opens a picker (bottom sheet on mobile, popover/modal on desktop) with:
  1. one search box that accepts **either a 7-digit postal code (郵便番号) or a place name**, with
     autocomplete (typing 渋谷 suggests 渋谷区議会 and 東京都議会);
  2. a secondary 「現在地から探す」 button (mock it — do not call the real geolocation API
     unnecessarily; a simulated result is fine);
  3. recently viewed assemblies;
  4. a browse list grouped by region (関東, 近畿, …).
- A postal code maps to **both** a prefecture and a municipality; when a municipality is known,
  the hub shows a small 都議会 / 区議会-style toggle between the two levels.
- Mock data: full content for 東京都議会, lighter content for 渋谷区議会, and a few other
  prefectures listed but marked 「準備中」 (coming soon). Include a small mock postal-code table
  (e.g. 150-xxxx → 渋谷区 / 東京都, 160-xxxx → 新宿区 / 東京都, 530-xxxx → 大阪市 / 大阪府 準備中).
- Remember the chosen region in `localStorage` (wrap in try/catch). A returning visitor on the
  landing page sees 「前回の地域：東京都議会 →」 as the primary button — **never silently
  redirect**.

### Landing page (`#/`) — keep it short
1. Hero: one-line mission (e.g. 「地元の議会で何が決まっているか、3分でわかる」) with the region
   picker search box right in it — picking your region is the landing page's main action.
2. Live preview: 3–4 trending bill cards from the default region — show the product, don't
   describe it.
3. What's inside: 議案ボード / 会議まとめ / 学ぶ — one line each plus a small visual.
4. How we make it (trust): official sources only, AI-assisted summaries reviewed by people, every
   claim links back to the original minutes/video timestamp, politically neutral, corrections
   welcome.
5. Get involved: volunteer link + newsletter signup.
6. Footer: About, corrections policy, contact, GitHub, and a note that this is a prototype with
   fictional data.

### Region hub — 議案 tab (the bill board)
This already exists as a refined prototype the user iterated on heavily. Its **features and
content rules** are requirements; its **visual style is not** — design the board your own way.
Reference file (read it for mock data and behavior; do not copy its look):
`/Users/rios/togikai-board/.skillslab/saved/togikai-board-none-v1.html`

Required features carried over:
- **Session status banner** on top: whether the assembly is in session now (e.g. 第222回定例会,
  opened / scheduled close dates) or, if not, the last session with opened/closed dates; includes a
  link to watch the plenary 中継 (or past recordings when closed). No pulsing "live" dot.
- **Single feed of bill cards**, filterable by category chips (住宅, 交通, 子育て, 防災, デジタル,
  福祉, 環境…). Each card: plain-language one-line caption as the main text, the official bill
  name small, a status (提出済み / 審議中 / 成立 / 否決) and a subtle 🔥 trending marker. Nothing else
  on the card. Long Japanese captions must never overflow.
- **Bill detail**, top to bottom: plain name + official name; status (+ trending); 提出会派 and the
  date written as 「2026年9月2日提出」 (date first, then 提出 / 可決 / 採決); a plain-language
  summary paragraph; 「何が変わる？」 as short one-line items in plain dictionary form with no
  headings or colons (style: 「"副首都"を法律上の制度として置く」「内閣に推進本部を置く」) and never
  listing who is affected or when it takes effect; 「自分にどう関係する？」 only for bills that
  actually affect residents; 「審議経過」 as an always-visible simple **5-stop progress stepper**
  (提出 → 委員会付託 → 委員会審議 → 本会議 → 成立/否決) with a one-line stage note and a link to
  that committee's 中継; and only **出典 (sources) collapsed** behind a toggle. Clear vertical
  spacing between sections. All body text in the detail at one size, except the title and the
  official name.
- Bill detail should also link to **meetings where this bill was discussed** (connects to 会議).

### Region hub — 会議 tab (new — meeting summaries)
- Meeting list: date, body (本会議 / 〇〇委員会 / 教育委員会), duration of the recording, number of
  topics, and a one-line "what was decided" summary. Filter by body.
- Meeting summary page — this is the new product, make it excellent:
  - header: body, date, duration, links to the official video and minutes (placeholders);
  - a short 「この会議のポイント」 summary (3–5 lines);
  - **topic chapters**, each with a timestamp range (e.g. 0:42:10–0:55:30), a plain-language
    summary, speakers (member name + 会派, or 局長 etc.), and a 「この場面を見る」 link that
    represents deep-linking into the video at that time;
  - **search within the meeting** (typing 保育料 highlights matching chapters/transcript lines);
  - an expandable transcript excerpt per chapter, clearly marked as coming from the minutes;
  - a disclosure line: AI-assisted summary, reviewed by a person, report errors link.
- Include 4–6 mock meetings with realistic multi-hour durations, including at least one
  教育委員会 (school board) meeting and at least one tied to bills on the board.

### Search (`#/search`)
One box, results grouped into 議案 and 会議の場面 (chapter-level hits with timestamps), working on
the mock data.

### Learn, About, Join
- 学ぶ: 3–5 short explainer cards (議会と議案の流れ, 委員会とは, 本会議とは, 中継の見方, 会議録とは),
  each opening to a short page.
- About: mission, "we are volunteers", how summaries are made (sources → transcription → AI draft
  → human review → publish with links), neutrality statement, corrections policy.
- Join: volunteer roles (開発, 要約レビュー, デザイン, 地域の担当), a contact form (no real
  submission — show a confirmation state), newsletter signup (same: confirmation state only).

## Content rules
- All data is fictional and should be clearly labeled as sample data (「架空」/ prototype note).
  Plausible names are fine; do not use real politicians' names.
- Links to external things that don't exist yet (official video, minutes PDF, GitHub) should be
  placeholders that do nothing harmful (e.g. `alert('プロトタイプ: …（未実装）')`) — do not invent
  real-looking external URLs.
- No fake network submissions of any kind.

## Output contract (non-negotiable)

- Write exactly one file:
  `/Users/rios/togikai-board/.skillslab/generated/2026-09-26-gikai-board-website/direction-a/<your-skill-id>/index.html`
  where `<your-skill-id>` is `design-taste-frontend`, `hallmark`, or `none` per your assignment.
  Write nowhere else in the project and never touch real source code. Do not modify
  `manifest.json` or the reference file.
- **Single self-contained file**: inline `<style>` and `<script>`, no build step, no external
  requests (no CDN JS/CSS, no remote fonts or images; system font stacks, inline SVG, CSS
  gradients or `data:` URIs only). No fetch/XHR.
- **Color token contract**: every color comes from a named custom property on `:root` — including
  gradient stops, shadows' tints, borders. Use `--color-background`, `--color-surface`,
  `--color-text`, `--color-text-muted`, `--color-primary`, `--color-secondary`, `--color-border`
  (first four required); extras named `--color-<meaning>`. No hardcoded hex/rgb inside rules.
  Fonts via `--font-heading` / `--font-body`.
- **Interactive**: real hover/focus states, at least one meaningful animation (entrance,
  route transition, scroll reveal, or micro-interaction); respect `prefers-reduced-motion`.
- **Responsive** from 390px to desktop — check mobile, tablet and desktop mentally; no horizontal
  page scroll, no overflowing Japanese text.
- Light or dark theme: your call, but intentional.
- Accessibility: semantic landmarks, keyboard-operable picker/modals (Esc closes), visible focus,
  sufficient contrast.

When finished, reply with a short summary (under 150 words): what you built and any requirement
you could not meet.
