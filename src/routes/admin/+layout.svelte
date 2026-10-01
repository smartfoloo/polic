<script>
	import { page } from '$app/state';
	import { KINDS } from '$lib/admin/flags.js';
	import { groupByQueue } from '$lib/admin/order.js';

	let { data, children } = $props();

	let query = $state('');
	let assembly = $state('');

	const filtered = $derived(
		data.bills.filter((b) => (!assembly || b.assembly === assembly) && (!query || b.id.includes(query) || b.name.includes(query)))
	);
	const groups = $derived(groupByQueue(filtered, data.queues));
	// Bills with nothing waiting only show up when you search for them.
	const done = $derived(query ? filtered.filter((b) => !b.queues.length) : []);
	const assemblies = $derived([...new Set(data.bills.map((b) => b.assembly))]);
	// Flag labels only where you're checking the Japanese, not in the English queues.
	const showFlags = (/** @type {string[]} */ queues) => ['held', 'sample', 'improve'].includes(queues[0]);
</script>

<svelte:head>
	<title>Review — Polic</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin">
	<aside class="side">
		<a class="brand" href="/admin">Polic <span>review</span></a>
		<div class="filters">
			<input type="search" placeholder="Search id or headline" bind:value={query} aria-label="Search bills" />
			<select bind:value={assembly} aria-label="Assembly">
				<option value="">All assemblies</option>
				{#each assemblies as a (a)}<option value={a}>{data.assemblyNames[a] ?? a}</option>{/each}
			</select>
		</div>
		<nav class="queues">
			{#each groups as g (g.id)}
				{#if g.items.length}
					<details open={g.id !== 'waiting'}>
						<summary title={g.hint}><span>{g.label}</span><b>{g.items.length}</b></summary>
						{#if g.id === 'waiting'}
							<p class="note">Run <code>npm run draft</code> and <code>npm run verify</code>.</p>
						{/if}
						<ul>
							{#each g.items as b (b.id)}
								<li>
									<a href="/admin/{b.id}" aria-current={page.params.id === b.id ? 'page' : undefined}>
										<span class="name">{b.name}</span>
										<span class="id">{b.id}</span>
										{#if showFlags(b.queues) && b.flags.length}
											<span class="flag-tags">
												{#each b.flags as f (f.kind)}
													<span class="flag-tag {KINDS[f.kind]?.tone}">{KINDS[f.kind]?.label ?? f.kind}{f.n > 1 ? ` ×${f.n}` : ''}</span>
												{/each}
											</span>
										{/if}
									</a>
								</li>
							{/each}
						</ul>
					</details>
				{/if}
			{/each}
			{#if done.length}
				<details open>
					<summary><span>Nothing waiting</span><b>{done.length}</b></summary>
					<ul>
						{#each done as b (b.id)}
							<li>
								<a href="/admin/{b.id}" aria-current={page.params.id === b.id ? 'page' : undefined}>
									<span class="name">{b.name}</span>
									<span class="id">{b.id}</span>
								</a>
							</li>
						{/each}
					</ul>
				</details>
			{/if}
		</nav>
	</aside>
	<div class="main">
		{@render children()}
	</div>
</div>

<style>
	.admin {
		display: grid;
		grid-template-columns: 300px 1fr;
		height: 100vh;
		background: var(--color-background);
	}

	.side {
		display: flex;
		flex-direction: column;
		min-height: 0;
		border-right: 1.5px solid var(--color-ink);
		background: var(--color-surface);
	}

	.brand {
		padding: 14px 16px 10px;
		font-family: var(--font-logo);
		font-size: 20px;
		font-weight: 700;
		color: var(--color-text);
	}

	.brand span {
		font-family: var(--font-body);
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-primary);
		margin-left: 4px;
	}

	.brand:hover {
		text-decoration: none;
	}

	.filters {
		display: grid;
		gap: 6px;
		padding: 0 12px 12px;
		border-bottom: 1px solid var(--color-border);
	}

	.filters input,
	.filters select {
		height: 34px;
		padding: 0 10px;
		border: 1px solid var(--color-border-strong);
		background: var(--color-background);
		font-size: 13.5px;
		min-width: 0;
	}

	.queues {
		flex: 1;
		overflow-y: auto;
		padding-bottom: 24px;
	}

	summary {
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		background: var(--color-surface-alt);
		border-bottom: 1px solid var(--color-border);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
	}

	summary b {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.note {
		padding: 8px 16px;
		font-size: 12.5px;
		color: var(--color-text-muted);
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li a {
		display: grid;
		gap: 1px;
		padding: 8px 16px;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text);
		line-height: 1.45;
	}

	li a:hover {
		background: var(--color-hover);
		text-decoration: none;
	}

	li a[aria-current='page'] {
		background: var(--color-primary);
		color: var(--color-on-primary);
	}

	.name {
		font-size: 13.5px;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.id {
		font-family: var(--font-mono);
		font-size: 11.5px;
		opacity: 0.7;
	}

	.flag-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 3px;
		margin-top: 3px;
	}

	.flag-tag {
		--tone: var(--color-status-active);
		padding: 0 5px;
		border: 1px solid var(--tone);
		color: var(--tone);
		font-size: 10.5px;
		font-weight: 800;
		line-height: 1.5;
	}

	.flag-tag.error {
		--tone: var(--color-status-rejected);
	}

	.flag-tag.info {
		--tone: var(--color-primary);
	}

	.flag-tag.muted {
		--tone: var(--color-text-muted);
	}

	li a[aria-current='page'] .flag-tag {
		--tone: var(--color-on-primary);
	}

	.main {
		min-width: 0;
		min-height: 0;
	}

	@media (max-width: 900px) {
		.admin {
			grid-template-columns: 1fr;
			grid-template-rows: 40vh 1fr;
		}

		.side {
			border-right: 0;
			border-bottom: 1.5px solid var(--color-ink);
		}
	}
</style>
