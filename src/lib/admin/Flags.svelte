<script>
	// All flags on a bill, most serious first. The quote jumps to the text in the draft; 「terms」 and
	// article numbers in a note search the source. "Done" only lasts while the page is open. Dismissed
	// Resolved flags (misflags, or fixed in the text; saved in the bill) sit at the end with the reason and a Reopen button.
	import { FIELD_LABEL, KINDS, noteParts } from './flags.js';

	/**
	 * @type {{
	 *   flags: (import('./flags.js').Flag & { key: string })[],
	 *   done: Set<string>,
	 *   onjump: (f: import('./flags.js').Flag) => void,
	 *   onfind: (text: string) => void
	 * }}
	 */
	let { flags, done, onjump, onfind } = $props();

	const open = $derived(flags.filter((f) => !f.dismissed));
	const dismissed = $derived(flags.filter((f) => f.dismissed));
	const left = $derived(open.filter((f) => !done.has(f.key)).length);
</script>

<section class="flags" aria-label="Flags">
	<header>
		<h3>Flags</h3>
		{#if open.length}<span>{left} of {open.length} left</span>{/if}
	</header>
	{#if !open.length}
		<p class="none">Nothing flagged. Read it against the source, then approve.</p>
	{/if}
	{#each [...open, ...dismissed] as f (f.key)}
		{@const kind = KINDS[f.kind] ?? { label: f.kind, tone: 'warn' }}
		<article id="flag-{flags.indexOf(f)}" class="flag {kind.tone}" class:done={done.has(f.key)} class:dismissed={f.dismissed}>
			<div class="head">
				<span class="kind">{kind.label}</span>
				{#if f.field}<span class="where">in {FIELD_LABEL[f.field] ?? f.field}</span>{/if}
				{#if f.sure === false}<span class="where">· checker unsure</span>{/if}
				{#if f.dismissed}
					<button class="undo" formaction="?/undismiss" name="ref" value={JSON.stringify(f.ref)}>Reopen</button>
				{:else}
					<label class="tick">
						<input type="checkbox" checked={done.has(f.key)} onchange={(e) => (e.currentTarget.checked ? done.add(f.key) : done.delete(f.key))} />
						Done
					</label>
				{/if}
			</div>
			{#if f.quote}
				<button type="button" class="quote" title={f.field ? 'Select this in the draft' : undefined} onclick={() => onjump(f)}>{f.quote}</button>
			{/if}
			<p class="note">
				{#each noteParts(f.note) as p, j (j)}{#if p.find}<button type="button" class="find" title="Find in source" onclick={() => onfind(/** @type {string} */ (p.find))}>{p.text}</button>{:else}{p.text}{/if}{/each}
			</p>
			{#if f.dismissed}
				<p class="why-dismissed"><b>Resolved:</b> {f.dismissed.note}</p>
			{/if}
		</article>
	{/each}
</section>

<style>
	.flags {
		display: grid;
		gap: 8px;
		margin-bottom: 8px;
	}

	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	h3 {
		font-family: var(--font-body);
		font-size: 14px;
	}

	header span,
	.none {
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.flag {
		--tone: var(--color-status-active);
		padding: 10px 12px;
		background: var(--color-surface);
		border: 1px solid var(--color-border-strong);
		border-left: 5px solid var(--tone);
		scroll-margin: 60px;
		transition: opacity 0.15s;
	}

	.flag.error {
		--tone: var(--color-status-rejected);
	}

	.flag.info {
		--tone: var(--color-primary);
	}

	.flag.muted {
		--tone: var(--color-border-strong);
	}

	.flag.done {
		opacity: 0.45;
	}

	.flag.dismissed {
		--tone: var(--color-border-strong);
		border-style: dashed;
		border-left-style: solid;
		background: transparent;
	}

	.flag.dismissed .kind {
		color: var(--color-text);
	}

	.flag.dismissed .quote,
	.flag.dismissed .note {
		opacity: 0.6;
	}

	.why-dismissed {
		margin-top: 6px;
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.undo {
		margin-left: auto;
		padding: 0 8px;
		border: 1px solid var(--color-border-strong);
		background: var(--color-surface);
		font-size: 12px;
	}

	.undo:hover {
		border-color: var(--color-ink);
	}

	.flag:target {
		box-shadow: 3px 3px 0 var(--color-ink);
	}

	.head {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12.5px;
	}

	.kind {
		padding: 1px 8px;
		background: var(--tone);
		color: var(--color-on-primary);
		font-size: 11.5px;
		font-weight: 800;
		letter-spacing: 0.03em;
	}

	.flag.muted .kind {
		color: var(--color-text);
	}

	.where {
		color: var(--color-text-muted);
	}

	.tick {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-left: auto;
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.quote {
		display: block;
		width: 100%;
		margin-top: 8px;
		padding: 4px 8px;
		border: 0;
		background: var(--color-highlight);
		text-align: left;
		font-size: 14px;
		line-height: 1.6;
	}

	.quote::before {
		content: '「';
	}

	.quote::after {
		content: '」';
	}

	.quote:hover {
		box-shadow: inset 0 -2px 0 var(--color-ink);
	}

	.note {
		margin-top: 6px;
		font-size: 13.5px;
		line-height: 1.7;
	}

	.find {
		padding: 0 1px;
		border: 0;
		background: none;
		color: var(--color-primary);
		text-decoration: underline dotted;
		text-underline-offset: 3px;
		font-size: inherit;
	}

	.find:hover {
		background: var(--color-primary-soft);
	}
</style>
