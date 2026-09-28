# Skillslab — design generation workflow for togikai-board

This project has Skillslab installed. When the user asks for **any web design, page, UI
concept, redesign, or visual direction**, follow this workflow instead of writing a design
straight into the codebase.

Everything you generate is a **preview**, written only inside `.skillslab/`. **Never modify the
user's actual source code during generation.** The codebase is only touched later, when the user
picks a winner in the dashboard and asks you to apply it (see *Applying to the project*).

## The command

Given a design prompt (e.g. "landing page for a running-shoe brand"), generate the configured
number of distinct design directions (see below), and build each one with every skill configured
below. Then register the run so the dashboard picks it up. Do not ask which skills or how many
directions to use — read the configuration below.

## Configured skills

<!-- skillslab:skills:start -->
This project is configured to generate **1 distinct design direction**,
each built in **3 versions** — one per entry below. The value in `code` is
the exact folder name to write to.

Direction ids are exactly: `direction-a`.

- `design-taste-frontend` → invoke the **design-taste-frontend** skill by name. Priorities: Distinctive but tasteful. Real design-system thinking, not templated.
- `hallmark` → invoke the **hallmark** skill by name. Priorities: Novel, anti-slop, a signature idea. The boldest take.
- `none` → do **not** invoke any skill. Design it with your own judgment only. This is the control version, so do not quietly borrow another skill's approach.

So each direction produces 3 files:

```
.skillslab/generated/<run-slug>/<direction-id>/
  design-taste-frontend/index.html
  hallmark/index.html
  none/index.html
```

Pass every entry the same context: the user's prompt **and** the direction lines.
Also record the list in the run's `skills` field in `manifest.json` (see schema below), so the
dashboard shows the right columns even if this configuration changes later.

## How to run this build: 3 subagents, one per skill

**There is nothing to invent before spawning.** The single direction is the user's prompt, verbatim — pass it straight through (see *Writing a direction*). Do not design the pages here.

Then spawn **one subagent per skill entry above**. Each one
builds every direction for its own skill:

- subagent for `design-taste-frontend` → builds `direction-a/design-taste-frontend/index.html`
- subagent for `hallmark` → builds `direction-a/hallmark/index.html`
- subagent for `none` → builds `direction-a/none/index.html`

This grouping is deliberate. The skills must not see each other's work, because comparing their
takes on the prompt is the whole point.

Give each subagent a self-contained prompt: the user's original prompt in full, every direction
line, its skill assignment, the output paths, and the output-format rules from this file. It cannot
see this conversation. **The subagent decides how to interpret each direction** — layout, structure,
type, motion, colour. Do not make those calls for it, and do not expect two columns to read the same
direction the same way.

**Save that prompt verbatim to `<run-slug>/prompts/subagent.md` — one file, not one per skill.**
Every column gets the same prompt apart from which skill it is told to use, so write the shared body
once and mark the skill assignment as the single varying line.
<!-- skillslab:skills:end -->

## Directory contract (do not deviate)

```
.skillslab/
  generated/
    manifest.json                       ← the dashboard reads ONLY this
    <run-slug>/
      prompt.txt                        ← the raw prompt, for reference
      prompts/subagent.md               ← the verbatim subagent prompt (shared by every column)
      <direction-id>/                   ← direction-a, direction-b, … (see Configured skills)
        <skill-id>/index.html           ← one self-contained site per configured skill
```

- `run-slug`: `YYYY-MM-DD-short-kebab-topic` (e.g. `2026-07-24-running-shoe`). Keep it unique;
  if today's slug exists, append `-2`, `-3`, …
- Direction ids are **exactly** the ones listed in *Configured skills* above (e.g. `direction-a`,
  `direction-b`, …) — one per configured direction, no more, no fewer.
- Skill folder names are **exactly** the ids listed in *Configured skills* above.
- Each design's entry file is **exactly** `index.html`. The dashboard derives every path from
  this convention — filenames must match or the preview 404s.

## Generation Workflow

1. **Restate the request** in one line and pick a `run-slug`.
2. **Determine the direction(s)**, per the count configured above (see *Configured skills*).
   - **If exactly 1 direction is configured** (the default), don't invent anything. The
     direction *is* the user's prompt, verbatim — `summary` is the prompt itself, `name` is a
     short label for it (e.g. "Running Shoe Landing"). Skip *Writing a direction* below entirely;
     there's nothing to write.
   - **If more than 1 is configured**, invent that many genuinely different design *concepts* —
     not palette swaps. Each one is a short `name` and a one-sentence `summary` (see *Writing a
     direction* below). Example set (shown here for 3):
     - Direction A — "Quiet Passbook": reads like the digital evolution of a paper passbook. Not a fintech dashboard.
     - Direction B — "Kinetic Bold": the energy of a race-day timing board. Not a corporate deck.
     - Direction C — "Warm Organic": the feel of a handwritten recipe card. Not a wellness startup.
3. **Register the run now, before building anything.** Append it to
   `.skillslab/generated/manifest.json` (schema below) with `"status": "generating"`, the full
   `directions` list, and the `skills` list. This is what lets the dashboard show the grid's real
   shape immediately and fill each tile in as its file lands, instead of the user staring at a
   blank page for several minutes. Do not skip it and do not defer it to the end.
4. **Write the shared subagent prompt** to `<run-slug>/prompts/subagent.md` before spawning
   anything (see *How to run this build* above). One file, verbatim, shared by every column.
   The dashboard shows it, and it is how the user diagnoses a run where every design came out
   the same.
5. **For each direction, produce one version per configured skill** (see *Configured skills*
   above). Every version gets the same direction line and decides for itself what it means.
6. **Write each result** to its `index.html` at the contract path.
7. **Close the run** by setting its `"status"` to `"done"` in `manifest.json` once every file
   exists. Newest run first in the `runs` array is nice but not required.
8. **Report back**: give the run slug and tell the user the dashboard has it
   (`npx skillslab` if it isn't running).

## Writing a direction

This section only applies when more than one direction is configured. With a single direction
(the default), there is nothing to write — use the raw prompt, per step 2 above.

A direction is **two lines, not a document**: an anchor and an anti-reference. That is all you
write. The subagent building it decides everything else.

- **Anchor** — name a concrete thing the design should feel like. A real object, artifact, or
  place. "Reads like the digital evolution of a paper passbook." An anchor survives being
  interpreted by three different agents; an adjective pile ("formal, restrained, trustworthy")
  does not, because it does not point at anything.
- **Anti-reference** — what this is deliberately *not*, in a few words. "Not a fintech dashboard."
  This is the cheapest line you can write and usually the most useful, because it rules out a
  whole region of interpretation at once.

Both go in the direction's `name` and `summary` in `manifest.json`. There is no separate brief
file.

**Do not write structure.** No section lists, no reading order, no component choices, no "actions
as text rows rather than icon tiles", no type or layout or motion decisions. Those belong to the
skill, and the moment you write them down every skill produces the same screen.

**Do not restate the user's constraints in the direction.** Anything they specified — required
sections, language, platform, audience — applies to every cell in the grid, so it goes in the
shared subagent prompt instead. Directions carry only what makes A different from B.

Different subagents will interpret the same direction differently. That is expected and fine.

## Output format for generated sites (default: lightweight)

Unless the user explicitly asks for a framework, each `index.html` must be a **single,
self-contained file**: HTML + inline `<style>` + inline `<script>`. No build step, no external
requests (no CDN CSS/JS, no remote fonts or images — use system font stacks, inline SVG, CSS
gradients, or `data:` URIs). This keeps previews instant and portable, and lets them render
inside the dashboard's iframes.

### Color token contract (required — the editor depends on it)

The dashboard has a live color editor that retunes a design and writes the result back into its
file. It finds what's editable by reading the custom properties declared on `:root`. So **every
color must come from a named token on `:root`** — including gradient stops,
`-webkit-text-stroke`, and box-shadow tints. A hardcoded hex buried in a rule is invisible to
the editor and cannot be retuned.

Use these exact names so the editor shows meaningful labels:

| Token | Role |
| --- | --- |
| `--color-background` | page background |
| `--color-surface` | cards, panels, raised areas |
| `--color-text` | primary text |
| `--color-text-muted` | secondary text |
| `--color-primary` | main brand / accent |
| `--color-secondary` | supporting accent |
| `--color-border` | hairlines, dividers |

Required: `--color-background`, `--color-text`, `--color-text-muted`, `--color-primary`.
The rest are optional. Extra colors are fine — name them `--color-<meaning>`
(e.g. `--color-accent-warm`), never `--c1` or `--brand2`; the editor turns the name into the
label the user reads. Fonts should use `--font-heading` / `--font-body`.

Requirements for every site — these are what the dashboard showcases, so they must actually work:

- **Interactive, not static**: real hover states, at least one meaningful CSS/JS animation
  (entrance, scroll-reveal, or micro-interaction), and working scroll.
- **Responsive**: must hold up from 390px to desktop. The dashboard's fullscreen view has
  Mobile / Tablet / Desktop width toggles — test all three mentally.
- **Theme**: light or dark is fine per design; just make it intentional.
- **Self-contained**: no `fetch`/XHR to other origins, nothing that needs a server.

If the user asks for another stack (React, multi-file, etc.), honor it, but still land a runnable
`index.html` at the contract path (e.g. a built bundle) so the preview works.

## manifest.json schema

The dashboard needs only structure + labels; it derives file paths by convention. The example
below shows the multi-direction shape (opt-in); with the default single direction, `directions`
has exactly one entry, whose `summary` is the raw prompt and `name` a short label for it.

```json
{
  "runs": [
    {
      "slug": "2026-07-24-running-shoe",
      "title": "Running-shoe brand landing page",
      "prompt": "Landing page for a premium running-shoe startup …",
      "createdAt": "2026-07-24",
      "status": "generating",
      "skills": [
        { "id": "impeccable", "label": "Impeccable" },
        { "id": "design-taste-frontend", "label": "Taste" },
        { "id": "hallmark", "label": "Hallmark" }
      ],
      "directions": [
        { "id": "direction-a", "name": "Quiet Passbook", "summary": "The digital evolution of a paper passbook. Not a fintech dashboard." },
        { "id": "direction-b", "name": "Kinetic Bold",   "summary": "The energy of a race-day timing board. Not a corporate deck." },
        { "id": "direction-c", "name": "Warm Organic",   "summary": "The feel of a handwritten recipe card. Not a wellness startup." }
      ]
    }
  ]
}
```

Rules: `directions` must have exactly as many entries as configured above (see *Configured
skills*), with ids matching that list exactly (`direction-a`, `direction-b`, …). `createdAt` is
shown in the dashboard's run picker, so always set it. `summary` is the direction itself: with a
single direction configured, that's the raw prompt; with more than one, it's the anchor plus
anti-reference, one sentence (see *Writing a direction*). `skills` must list the skills this run was
actually built with, using the ids from *Configured skills* — the dashboard reads it to lay out
columns, so a run stays viewable even after the configuration changes. Do **not** list file
paths; the dashboard builds those by convention.

`status` is `"generating"` while the run is being built and `"done"` once every `index.html`
exists. Write the entry with `"generating"` *before* spawning subagents (step 3) and flip it to
`"done"` at the end (step 7). While a run is generating the dashboard polls and fills tiles in
one at a time, so an entry left on `"generating"` polls forever and one written only at the end
shows the user nothing while they wait.

## The picked design

The dashboard's only job is to tell you which design the user is looking at. When they click
**Use this design**, it writes `.skillslab/selection.json`:

```json
{
  "run": { "slug": "2026-07-24-running-shoe", "title": "Running-shoe brand landing page" },
  "direction": { "id": "direction-b", "name": "Kinetic Bold", "summary": "…" },
  "skill": { "id": "hallmark", "label": "Hallmark" },
  "path": ".skillslab/generated/2026-07-24-running-shoe/direction-b/hallmark/index.html",
  "at": "2026-07-24T11:02:40.786Z"
}
```

**That file is the answer whenever the user says "this design", "this one", "it", or "the one I
picked".** Read it, then read the `index.html` it points at. Everything else — what to change,
where, how — you work out by asking them, exactly as you would for any other request.

Always name the design in one line before acting, because a pick can be hours old:

> Applying Direction B, Hallmark. Right?

If `selection.json` doesn't exist and it isn't obvious which design they mean, ask which one
rather than guessing.

## Refining a design

Refinement happens in conversation. There is no dashboard control for it and there does not need
to be — the user says "make it denser", "lose the gradient", "try it dark", and you:

1. Read the picked design's **current** `index.html`. It may already contain colour edits made in
   the dashboard's editor, which rewrites the file in place (appending a
   `<style id="dl-overrides">` block, with the pristine original kept at `index.base.html`).
2. Rewrite it **in place at the same path**, honoring the same output rules as generation
   (self-contained file, `:root` colour tokens, interactive, responsive).
3. Do not create a new run, a new folder, or a `v2` file. The grid is a fixed comparison; adding
   tiles to it destroys the thing the user came to look at.
4. Tell them to reload the dashboard.

Refine only the design they picked, unless they clearly ask for more.

## Applying to the project

The user asks in their own words: "apply this to the pricing page", "use this everywhere". This
is the **only** time you touch the real codebase.

First, clarify scope by asking before touching any code:

1. **What should you apply?** Options: Full design (default), Colors and typography only,
   Colors only, Let me describe it.
2. **Where should you apply this?** Only ask this when the chosen aspects reach into markup.
   Offer the whole project as the default, and let them describe a target in their own words.

Skip a question only when the user already answered it in their message. "Apply just the colors
to the pricing page" answers both; do not ask it back to them.

Then:

1. Read the picked preview file in full.
2. Detect the project's existing styling system and **adopt it**. Do not paste the preview's raw
   HTML in, and do not introduce a competing styling approach.
3. Port the *design language* — palette, type treatment, spacing rhythm, component shapes,
   motion — onto the project's real components. Map the palette onto existing theme variables.
4. Preserve all functionality, routes, props, state, and tests. This is a restyle, not a rewrite.
5. Preserve accessibility: contrast, focus states, semantics, reduced motion.
6. Never modify anything inside `.skillslab/` when applying — it is scratch space.
7. Report every file you changed and why.

If applying would require large structural refactors, stop and describe the trade-offs first.

### Scope is binding

Whatever the user did not pick is out of bounds. Do not change it even where the preview clearly
differs, and do not raise it as a missed opportunity unless they ask.

**Where** is written the way the user thinks about it ("the pricing page"), *not* as a file path.
**Resolve it to files yourself** by inspecting the project. Never ask them for a path. If it stays
genuinely ambiguous after looking, name your best guess and the alternatives in the plan step
rather than blocking on a question.

**Plan first whenever the scope reaches into markup** (spacing and shape, motion, or layout) on a
project that already has UI: list the files you intend to change with a one-line reason each, and
wait for confirmation before editing anything.

### If the project has no UI yet

When the project has no components or pages to restyle, you are building the design rather than
porting it. Create the files, set the palette up as real design tokens in a theme file instead of
literal colors in components, and skip both the scope questions and the plan step — there is
nothing to overwrite.
