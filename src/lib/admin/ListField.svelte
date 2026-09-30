<script>
	/** @type {{ items: string[], add?: string }} */
	let { items = $bindable(), add = 'Add' } = $props();
</script>

<div class="list">
	{#each items as _, i (i)}
		<div class="row">
			<span class="n">{i + 1}</span>
			<textarea rows="1" bind:value={items[i]}></textarea>
			<button type="button" class="x" aria-label="Remove item {i + 1}" onclick={() => items.splice(i, 1)}>×</button>
		</div>
	{/each}
	<button type="button" class="add" onclick={() => items.push('')}>+ {add}</button>
</div>

<style>
	.list {
		display: grid;
		gap: 6px;
	}

	.row {
		display: grid;
		grid-template-columns: 22px 1fr 30px;
		align-items: start;
		gap: 6px;
	}

	.n {
		padding-top: 8px;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--color-text-muted);
		text-align: right;
	}

	.x {
		height: 36px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--color-text-muted);
		font-size: 18px;
	}

	.x:hover {
		border-color: var(--color-status-rejected);
		color: var(--color-status-rejected);
	}

	.add {
		justify-self: start;
		margin-left: 28px;
		padding: 4px 10px;
		border: 1px dashed var(--color-border-strong);
		background: transparent;
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.add:hover {
		border-color: var(--color-ink);
		color: var(--color-text);
	}
</style>
