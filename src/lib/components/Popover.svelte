<script>
	// A small click-to-open note (stepper terms, 定例会 details). Works inside the bill dialog.
	/** @type {{ label: import('svelte').Snippet, children: import('svelte').Snippet, ariaLabel?: string, class?: string }} */
	let { label, children, ariaLabel, class: cls = '' } = $props();

	let open = $state(false);
	let pos = $state({ left: 0, top: 0 });
	/** @type {HTMLButtonElement} */
	let btn;
	/** @type {HTMLDivElement | undefined} */
	let pop = $state();
	const id = $props.id();

	function place() {
		if (!pop) return;
		const b = btn.getBoundingClientRect();
		const w = pop.offsetWidth;
		const h = pop.offsetHeight;
		const left = Math.min(Math.max(16, b.left + b.width / 2 - w / 2), innerWidth - w - 16);
		const top = b.bottom + 8 + h > innerHeight - 16 ? b.top - h - 8 : b.bottom + 8;
		pos = { left, top };
	}

	$effect(() => {
		if (open && pop) place();
	});

	/** @param {MouseEvent} e */
	function outside(e) {
		if (open && !btn.contains(/** @type {Node} */ (e.target)) && !pop?.contains(/** @type {Node} */ (e.target))) open = false;
	}

	/** Escape closes the note, not the dialog around it. */
	function key(/** @type {KeyboardEvent} */ e) {
		if (open && e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			open = false;
			btn.focus();
		}
	}
</script>

<svelte:window onclick={outside} onkeydowncapture={key} onscrollcapture={() => (open = false)} onresize={() => (open = false)} />

<button
	bind:this={btn}
	type="button"
	class="term {cls}"
	aria-expanded={open}
	aria-controls={id}
	aria-label={ariaLabel}
	onclick={() => (open = !open)}>{@render label()}</button
>
{#if open}
	<div bind:this={pop} {id} class="term-pop" role="note" style:left="{pos.left}px" style:top="{pos.top}px">
		{@render children()}
	</div>
{/if}

<style>
	.term {
		font: inherit;
		color: inherit;
		background: none;
		border: 0;
		padding: 0;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		cursor: pointer;
	}

	.term :global(.q) {
		display: inline-grid;
		place-items: center;
		width: 15px;
		height: 15px;
		border-radius: 50%;
		font-size: 10px;
		font-weight: 800;
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		border: 1px solid var(--color-border-strong);
	}

	.term:hover :global(.q),
	.term[aria-expanded='true'] :global(.q) {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-on-primary);
	}

	.term-pop {
		position: fixed;
		z-index: 5;
		width: min(280px, calc(100vw - 32px));
		padding: 14px 16px;
		background: var(--color-surface);
		border: 1.5px solid var(--color-ink);
		box-shadow: 5px 5px 0 var(--color-shadow-hard);
		font-size: 14px;
		line-height: 1.7;
		text-align: left;
		color: var(--color-text);
		font-weight: 400;
		animation: popIn 0.15s var(--ease) both;
	}

	.term-pop :global(b) {
		display: block;
		margin-bottom: 2px;
	}

	@keyframes popIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
	}
</style>
