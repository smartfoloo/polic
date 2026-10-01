<script>
	import { groupByQueue, reviewOrder } from '$lib/admin/order.js';

	let { data } = $props();

	const groups = $derived(groupByQueue(data.bills, data.queues).filter((g) => g.items.length));
	const todo = $derived(groups.filter((g) => g.group === 'todo'));
	const rest = $derived(groups.filter((g) => g.group !== 'todo'));
	const first = $derived(reviewOrder(data.bills, data.queues)[0]);
	const live = $derived(data.bills.filter((b) => b.state !== 'held').length);
</script>

<div class="home">
	<h1>What's waiting</h1>
	<p class="lead">{live} of {data.bills.length} bills are on the site. Pick a bill on the left, or start from the top.</p>

	{#if todo.length}
		<dl class="queues">
			{#each todo as g (g.id)}
				<div>
					<dt>{g.label} <b>{g.items.length}</b></dt>
					<dd>{g.hint}</dd>
				</div>
			{/each}
		</dl>
		{#if first}<a class="start" href="/admin/{first.id}">Start reviewing →</a>{/if}
	{:else}
		<p class="clear">Nothing you need to do.</p>
	{/if}

	{#if rest.length}
		<h2>Optional</h2>
		<p class="lead">Already on the site. Read these only if you have time; the scripts clear the last ones.</p>
		<ul class="rest">
			{#each rest as g (g.id)}
				<li><b>{g.items.length}</b> {g.label.toLowerCase()} <span>· {g.hint}</span></li>
			{/each}
		</ul>
	{/if}

	<p class="foot">Edits are saved to <code>data/</code>. Commit them in batches, e.g. <code>chore: Approve held Minato bills</code>.</p>
</div>

<style>
	.home {
		max-width: 640px;
		padding: 48px 40px;
	}

	h1 {
		font-size: 28px;
	}

	.lead {
		margin-top: 6px;
		color: var(--color-text-muted);
	}

	.queues {
		display: grid;
		gap: 8px;
		margin: 24px 0;
	}

	.queues div {
		padding: 12px 16px;
		background: var(--color-surface);
		border: 1.5px solid var(--color-ink);
	}

	dt {
		font-weight: 700;
	}

	dt b {
		font-family: var(--font-mono);
		color: var(--color-primary);
		margin-left: 4px;
	}

	dd {
		margin: 0;
		font-size: 13.5px;
		color: var(--color-text-muted);
	}

	.clear {
		margin: 24px 0;
		font-weight: 700;
	}

	h2 {
		margin-top: 40px;
		font-size: 18px;
	}

	.rest {
		margin: 12px 0 0;
		padding: 0;
		list-style: none;
		font-size: 14px;
		line-height: 1.9;
	}

	.rest b {
		font-family: var(--font-mono);
	}

	.rest span {
		color: var(--color-text-muted);
		font-size: 13px;
	}

	.start {
		display: inline-block;
		padding: 10px 18px;
		background: var(--color-primary);
		color: var(--color-on-primary);
		font-weight: 700;
		border: 1.5px solid var(--color-ink);
	}

	.start:hover {
		text-decoration: none;
		box-shadow: 3px 3px 0 var(--color-ink);
	}

	.foot {
		margin-top: 32px;
		font-size: 13px;
		color: var(--color-text-muted);
	}
</style>
