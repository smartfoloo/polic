<script>
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { t, href, isEn, categoryLabel, statusLabel, STATUS_CLASS } from '$lib/i18n.js';
	import { billName, billPath, proposer } from '$lib/bills.js';
	import { normQuery, find, highlight } from '$lib/search.js';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();

	let q = $state('');
	onMount(() => (q = new URL(location.href).searchParams.get('q') ?? ''));

	const byId = (/** @type {string} */ id) => /** @type {import('$lib/bills.js').PublicAssembly} */ (data.assemblies.find((a) => a.id === id));

	/** Searchable text of a bill, in the page language plus the official Japanese title. */
	function fields(/** @type {import('$lib/bills.js').PublicBill} */ b) {
		const en = isEn() ? b.en : null;
		return [
			billName(b),
			en?.official ?? '',
			b.official,
			b.number,
			en?.summary ?? b.summary ?? '',
			b.category ? categoryLabel(b.category) : '',
			...(en?.changes ?? b.changes ?? []),
			...(en?.who ?? b.who ?? []),
			en?.why ?? b.why ?? ''
		].filter(Boolean);
	}

	const terms = $derived(q.split(/\s+/).map(normQuery).filter(Boolean));
	const hits = $derived(
		terms.length
			? data.bills
					.map((b) => ({ b, f: fields(b) }))
					.filter(({ f }) => terms.every((term) => f.some((s) => find(s, term))))
					.map(({ b, f }) => ({ b, snip: f.find((s) => find(s, terms[0])) ?? '' }))
			: []
	);

	// The five most common topics, as starting points.
	const suggestions = $derived.by(() => {
		/** @type {Record<string, number>} */
		const n = {};
		for (const b of data.bills) if (b.category) n[b.category] = (n[b.category] ?? 0) + 1;
		return Object.keys(n)
			.sort((a, b) => n[b] - n[a])
			.slice(0, 5)
			.map(categoryLabel);
	});

	function update(/** @type {string} */ value) {
		q = value;
		const url = new URL(page.url);
		if (value.trim()) url.searchParams.set('q', value.trim());
		else url.searchParams.delete('q');
		replaceState(url, {});
	}
</script>

<svelte:head>
	<title>{t('さがす', 'Search')} — Polic</title>
</svelte:head>

<div class="container narrow">
	<div class="page-head"><h1>{t('さがす', 'Search')}</h1></div>
	<div class="search-box" role="search">
		<div class="field">
			<Icon name="search" />
			<label class="sr" for="q">{t('キーワード', 'Keyword')}</label>
			<input
				id="q"
				class="input"
				type="search"
				placeholder={t('例：保育、手数料、区民税', 'e.g. childcare, fees, tax')}
				value={q}
				autocomplete="off"
				oninput={(e) => update(e.currentTarget.value)}
			/>
		</div>
		<div class="suggest">
			{#each suggestions as s (s)}
				<button type="button" class="chip" onclick={() => update(s)}>{s}</button>
			{/each}
		</div>
	</div>

	<div class="results" aria-live="polite">
		{#if terms.length}
			<section>
				<h2>{t('政策と提案', 'Policies and proposals')}<span class="n">{t(`${hits.length}件`, `${hits.length}`)}</span></h2>
				{#if hits.length}
					<ul class="hit-list">
						{#each hits as { b, snip }, k (b.id)}
							{@const a = byId(b.assembly)}
							{@const name = billName(b)}
							<li>
								<a class="hit" style:--i={Math.min(k, 12)} href={href(billPath(b))}>
									<span class="hit-meta">
										<span>{t(a.place, a.placeEn)} · {proposer(b, a)}</span>
										<span class="status {STATUS_CLASS[b.status]}">{statusLabel(b.status)}</span>
									</span>
									<span class="hit-title">
										{#each highlight(name, terms[0]) as p, i (i)}{#if p.hit}<mark>{p.text}</mark>{:else}{p.text}{/if}{/each}
									</span>
									{#if snip && snip !== name}
										<span class="hit-snip">
											{#each highlight(snip, terms[0], 60) as p, i (i)}{#if p.hit}<mark>{p.text}</mark>{:else}{p.text}{/if}{/each}
										</span>
									{/if}
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="muted">{t('該当する政策・提案はありません。', 'No matching policies or proposals.')}</p>
				{/if}
			</section>
		{/if}
	</div>
</div>

<style>
	.search-box {
		margin-top: 20px;
	}

	.field {
		position: relative;
	}

	.field :global(svg) {
		position: absolute;
		left: 16px;
		top: 50%;
		width: 19px;
		height: 19px;
		transform: translateY(-50%);
		color: var(--color-text-muted);
		pointer-events: none;
	}

	.input {
		width: 100%;
		height: 54px;
		padding: 0 16px 0 46px;
		border: 1.5px solid var(--color-ink);
		background: var(--color-surface);
		font-size: 16px;
		box-shadow: 4px 4px 0 var(--color-shadow-hard);
	}

	.input:focus {
		outline: none;
		box-shadow: 4px 4px 0 var(--color-primary);
	}

	.suggest {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-top: 16px;
	}

	.results {
		padding: 24px 0 64px;
	}

	h2 {
		font-size: 16px;
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
	}

	.n {
		font-family: var(--font-body);
		font-size: 12.5px;
		color: var(--color-text-muted);
		background: var(--color-surface-alt);
		padding: 0 8px;
	}

	.hit-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.hit {
		display: block;
		padding: 14px 16px;
		background: var(--color-surface);
		border: 1.5px solid var(--color-ink);
		color: var(--color-text);
		transition:
			transform 0.15s var(--ease),
			box-shadow 0.15s var(--ease);
		animation: rise 0.35s var(--ease) both;
		animation-delay: calc(var(--i, 0) * 30ms);
	}

	.hit:hover {
		text-decoration: none;
		transform: translate(-2px, -2px);
		box-shadow: 5px 5px 0 var(--color-ink);
	}

	.hit-meta {
		font-size: 12.5px;
		color: var(--color-text-muted);
		display: flex;
		flex-wrap: wrap;
		gap: 4px 10px;
		align-items: center;
	}

	.hit-meta .status {
		height: 20px;
		font-size: 11px;
	}

	.hit-title {
		display: block;
		font-weight: 800;
		margin-top: 3px;
		line-height: 1.55;
	}

	.hit-snip {
		display: block;
		font-size: 14px;
		color: var(--color-text-muted);
		margin-top: 4px;
		line-height: 1.7;
	}
</style>
