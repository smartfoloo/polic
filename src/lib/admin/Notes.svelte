<script>
	// Under each field: the AI checker's notes on that field and numbers the source doesn't contain.
	const KIND = { fact: 'Fact', direction: 'Direction', unsupported: 'Not in source', tone: 'Tone', name: 'Personal name', omission: 'Missing (optional)' };

	/** @type {{ issues?: any[], missing?: string[] }} */
	let { issues = [], missing = [] } = $props();
</script>

{#if issues.length || missing.length}
	<ul class="notes">
		{#if missing.length}
			<li class="num">
				<span class="kind">Numbers</span>
				<span>Not found in the source: {#each missing as n, i (n)}{i ? ', ' : ''}<b>{n}</b>{/each}</span>
			</li>
		{/if}
		{#each issues as issue, i (i)}
			<li class={issue.kind === 'omission' ? 'opt' : issue.severity}>
				<span class="kind">{KIND[/** @type {keyof KIND} */ (issue.kind)] ?? issue.kind}</span>
				<span><q>{issue.quote}</q> {issue.note}</span>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.notes {
		list-style: none;
		margin: 6px 0 0;
		padding: 0;
		display: grid;
		gap: 4px;
	}

	li {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 8px;
		align-items: baseline;
		padding: 6px 10px;
		font-size: 13px;
		line-height: 1.6;
		border-left: 3px solid var(--color-status-active);
		background: var(--color-surface);
	}

	li.error {
		border-color: var(--color-status-rejected);
	}

	li.opt {
		border-color: var(--color-border-strong);
		color: var(--color-text-muted);
	}

	.kind {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	q {
		quotes: '「' '」';
		background: var(--color-highlight);
	}
</style>
