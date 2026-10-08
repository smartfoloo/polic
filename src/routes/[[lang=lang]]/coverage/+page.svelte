<script>
	import { t, href, gapNote, gapTag, GAPS } from '$lib/i18n.js';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();

	// Regions as people call them. The prefectural assembly goes first, without a heading of its own.
	const PREFS = [
		{ id: 'tokyo', ja: '東京都', en: 'Tokyo', regions: { ward: ['東京23区', "Tokyo's 23 wards"], city: ['多摩地域', 'Tama area'] } },
		{ id: 'kanagawa', ja: '神奈川県', en: 'Kanagawa', regions: { ward: ['', ''], city: ['市町村', 'Cities and towns'] } }
	];
	const pref = (/** @type {{ id: string, level: string, parent?: string }} */ a) => (a.level === 'pref' ? a.id : a.parent);
	const kind = (/** @type {{ level: string, name: string }} */ a) => (a.level === 'pref' ? 'pref' : a.name.endsWith('区議会') ? 'ward' : 'city');
	const KINDS = /** @type {const} */ (['pref', 'ward', 'city']);

	const live = $derived(
		PREFS.map((p) => ({
			...p,
			kinds: KINDS.map((k) => {
				const [ja, en] = k === 'pref' ? ['', ''] : p.regions[k];
				return { k, ja, en, list: data.assemblies.filter((a) => pref(a) === p.id && kind(a) === k) };
			}).filter((g) => g.list.length)
		})).filter((p) => p.kinds.length)
	);
	const sorted = (/** @type {import('$lib/config/assemblies.js').Gap[]} */ gaps) => GAPS.filter((g) => gaps.includes(g));
</script>

<svelte:head>
	<title>{t('対応している議会', 'Supported assemblies')} — Polic</title>
</svelte:head>

<div class="container narrow article">
	<div class="page-head">
		<h1>{t('対応している議会', 'Supported assemblies')}</h1>
	</div>

	<section>
		<p>
			{t(
				'議会によって公開している内容がちがうため、載せられる情報もちがいます。足りないものはタグで示しています。タグがない議会は、要約・採決日・委員会がそろっています。',
				'Assemblies publish different things, so what we can show differs too. Tags mark what is missing. Assemblies without tags have summaries, vote dates and committees.'
			)}
		</p>
		<dl class="legend">
			{#each GAPS as g (g)}
				<div>
					<dt><span class="tag">{gapTag(g)}</span></dt>
					<dd>{gapNote(g)}</dd>
				</div>
			{/each}
		</dl>
	</section>

	<section>
		{#snippet rows(/** @type {typeof data.assemblies} */ list)}
			<ul class="list">
				{#each list as a (a.id)}
					<li>
						<a class="name" href={href(`/${a.id}`)}>{t(a.name, a.nameEn)}</a>
						{#if a.gaps.length}
							<span class="tags">
								{#each sorted(a.gaps) as gap (gap)}<span class="tag" title={gapNote(gap)}>{gapTag(gap)}</span>{/each}
							</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/snippet}
		{#each live as p (p.id)}
			<details class="pref">
				<summary><Icon name="down" class="chev" />{t(p.ja, p.en)}</summary>
				<div class="body">
					{#each p.kinds as g (g.k)}
						{#if g.ja}
							<details class="region">
								<summary><Icon name="down" class="chev" />{t(g.ja, g.en)}</summary>
								<div class="body">{@render rows(g.list)}</div>
							</details>
						{:else}
							{@render rows(g.list)}
						{/if}
					{/each}
				</div>
			</details>
		{/each}
	</section>
</div>

<style>
	.article {
		padding-bottom: 64px;
	}

	section {
		padding: 28px 0;
		border-top: 1px solid var(--color-border-strong);
	}

	section:first-of-type {
		border-top: 0;
		padding-top: 0;
	}


	summary {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 0;
		font-weight: 700;
		cursor: pointer;
		list-style: none;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary:hover {
		color: var(--color-primary);
	}

	summary :global(.chev) {
		flex: none;
		width: 16px;
		height: 16px;
		transform: rotate(-90deg);
		transition: transform 0.15s;
	}

	details[open] > summary :global(.chev) {
		transform: none;
	}

	.body {
		padding-left: 22px;
	}

	.legend {
		margin: 16px 0 0;
		display: grid;
		gap: 8px;
	}

	.legend div {
		display: grid;
		grid-template-columns: 9.5em 1fr;
		align-items: baseline;
		gap: 10px;
	}

	.legend dt {
		justify-self: start;
	}

	.legend dd {
		margin: 0;
		font-size: 14px;
		color: var(--color-text-muted);
	}

	.tag {
		display: inline-block;
		font-size: 12px;
		font-weight: 700;
		line-height: 1;
		padding: 4px 7px;
		white-space: nowrap;
		border: 1.5px solid var(--color-border-strong);
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.list > li {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 4px 10px;
		padding: 4px 0;
	}

	.name {
		color: var(--color-text);
		text-decoration: none;
	}

	.name:hover {
		color: var(--color-primary);
		text-decoration: underline;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}


	@media (max-width: 560px) {
		.legend div {
			grid-template-columns: 1fr;
			gap: 4px;
		}
	}
</style>
