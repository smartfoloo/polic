# Subagent brief — Togikai Board homepage prototype

## The user's prompt, verbatim

> scaffold a prototype of the UI of the board

## Product context (applies to every version — build one self-contained `index.html`)

**Togikai Board** is an early prototype for a civic-engagement site that tracks bills and
votes in the **Tokyo Metropolitan Assembly (東京都議会)** — the prefectural legislature for
Tokyo. It's directly inspired by an existing site called **みんなの国会 (minna-no-kokkai)**,
which does this for Japan's national Diet, but Togikai Board exists specifically to fix
what feels cluttered about that reference: its homepage stacks a session-progress bar, a
donation banner, an "enacted bills" carousel, a separate SNS-trending ranked list, a
category grid, and a learn CTA all at once — nothing tells the visitor where to look first.

**The whole point of this product is to make people who don't normally care about local
government actually want to look at the site**, by presenting bill/vote data in an
understandable, decluttered way — not by being a raw data dashboard.

Build the **homepage** of this prototype. Content should be in Japanese (this is a Tokyo
civic site) with plausible sample/mock data — invent 6-10 realistic-sounding fake 都議会
bills (topics like housing, transit, childcare subsidies, disaster preparedness, digital
services, etc.) since this is a UI prototype, not wired to a real backend.

### Requirements every version must satisfy (these are fixed; how you express them is not)

1. **One primary ranked feed, not a dashboard of competing modules.** The homepage's main
   content is a single scrollable list/feed of bill cards, ordered by relevance or
   momentum — not several parallel sections fighting for attention.
2. **Each card leads with a plain-language, one-line summary** of what the bill actually
   does — not legal/procedural jargon. Avoid the reference site's dense stage-name jargon
   (e.g. 先議院委員会 / 先議院本会議 / 後議院委員会 / 後議院本会議).
3. **A simple status indicator**, roughly a 3-stage progression such as 提出済み → 審議中 →
   成立/否決, understandable at a glance without prior knowledge of how a legislature works.
4. **"Trending" is a subtle signal folded into a card** (e.g. a small badge/indicator), never
   its own separate ranked list or homepage module.
5. **Progressive disclosure on detail**: a card should be able to expand (or link) to a
   detail view that leads again with the plain summary and status, with sources/procedural
   detail/citations tucked behind a secondary toggle — not dumped all at once.
6. Browse/category navigation and an explainer ("what is this bill", "how does a bill
   become law") can exist, but as secondary navigation, not homepage real estate.

You decide the actual layout, visual language, typography, motion, and information
architecture beyond the fixed requirements above — those are yours to interpret.

## Skill assignment (the one line that varies per column)

**Use whichever skill instruction was given to you individually for this build** — either
"invoke the `design-taste-frontend` skill by name", "invoke the `hallmark` skill by name",
or "no skill — design it with your own judgment only, as the control version; do not
quietly borrow another skill's approach."

## Output contract (non-negotiable, from `.skillslab/AGENTS.md`)

- Write **one self-contained `index.html`**: inline `<style>` + inline `<script>`, no build
  step, no external network requests (no CDN CSS/JS, no remote fonts/images — system font
  stacks, inline SVG, CSS gradients, or `data:` URIs only).
- **Every color must be a named CSS custom property on `:root`**, using these exact names
  where applicable: `--color-background`, `--color-surface`, `--color-text`,
  `--color-text-muted`, `--color-primary`, `--color-secondary`, `--color-border`. Required:
  `--color-background`, `--color-text`, `--color-text-muted`, `--color-primary`. Extra
  colors are fine if named `--color-<meaning>` (never `--c1`/`--brand2`). No hardcoded hex
  buried in a rule — a live color editor reads only the `:root` tokens.
- Fonts via `--font-heading` / `--font-body` custom properties.
- **Interactive, not static**: real hover states, at least one meaningful CSS/JS animation
  (entrance, scroll-reveal, or micro-interaction), working scroll/expand interactions.
- **Responsive** from 390px to desktop — it will be checked at mobile/tablet/desktop widths.
- Light or dark theme is fine — just be intentional about it.

## Write your result to exactly this path (per your individual assignment)

`.skillslab/generated/2026-09-15-togikai-board/direction-a/<your-skill-id>/index.html`

where `<your-skill-id>` is one of `design-taste-frontend`, `hallmark`, or `none` — use the
one that matches your assignment. Do not write anywhere else in the project; this is
scratch/preview space only, never touch real source code.
