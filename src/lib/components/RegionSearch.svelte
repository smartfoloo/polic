<script>
	import { goto } from '$app/navigation';
	import { t, href } from '$lib/i18n.js';
	import { buildRegions, searchRegions } from '$lib/regions.js';
	import { REGION_REQUEST_URL } from '$lib/config/site.js';
	import Icon from './Icon.svelte';

	/** @type {{ assemblies: import('$lib/bills.js').PublicAssembly[] }} */
	let { assemblies } = $props();

	/** @type {[string, string, string][]} */
	let municipalities = $state([]);
	let loaded = false;
	// The municipality list is only needed once someone starts typing.
	async function load() {
		if (loaded) return;
		loaded = true;
		municipalities = /** @type {[string, string, string][]} */ ((await import('$lib/config/municipalities.json')).default);
	}

	const regions = $derived(buildRegions(assemblies, municipalities));

	let q = $state('');
	let open = $state(false);
	let active = $state(0);
	/** @type {import('$lib/regions.js').Region | null} */
	let picked = $state(null);

	const results = $derived(searchRegions(regions, q));
	const label = (/** @type {import('$lib/regions.js').Region} */ r) => t(r.name, r.nameEn);
	const optionId = (/** @type {number} */ i) => `region-opt-${i}`;

	function choose(/** @type {import('$lib/regions.js').Region} */ r) {
		open = false;
		if (r.assembly) {
			picked = null;
			goto(href(`/${r.assembly}`));
		} else {
			picked = r;
		}
	}

	/** @param {KeyboardEvent} e */
	function onkeydown(e) {
		if (e.isComposing) return;
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			if (!results.length) return;
			e.preventDefault();
			open = true;
			active = (active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
		} else if (e.key === 'Enter') {
			const r = results[active];
			if (open && r) {
				e.preventDefault();
				choose(r);
			}
		} else if (e.key === 'Escape') {
			open = false;
		}
	}
</script>

<div class="rs" role="search">
	<label class="sr" for="region-q">{t('地域を探す', 'Find your region')}</label>
	<div class="box">
		<Icon name="search" />
		<input
			id="region-q"
			type="text"
			role="combobox"
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			enterkeyhint="go"
			aria-expanded={open && q.trim() !== ''}
			aria-controls="region-list"
			aria-autocomplete="list"
			aria-activedescendant={open && results.length ? optionId(active) : undefined}
			placeholder={t('市区町村・都道府県の名前で探す', 'Search by city or prefecture')}
			bind:value={q}
			oninput={() => {
				open = true;
				active = 0;
				picked = null;
			}}
			onfocus={() => {
				load();
				open = q.trim() !== '';
			}}
			onblur={() => (open = false)}
			{onkeydown}
		/>
	</div>

	{#if open && q.trim()}
		<ul id="region-list" class="list" role="listbox" aria-label={t('地域の候補', 'Matching regions')}>
			{#each results as r, i (r.pref + r.name)}
				<!-- mousedown, not click: the input's blur would close the list before a click lands -->
				<li
					id={optionId(i)}
					role="option"
					aria-selected={i === active}
					class:active={i === active}
					onmousedown={(e) => {
						e.preventDefault();
						choose(r);
					}}
				>
					<span class="name">{label(r)}</span>
					{#if r.pref}<span class="pref">{r.pref}</span>{/if}
					{#if r.assembly}
						<span class="go"><Icon name="right" /></span>
					{:else}
						<span class="soon">{t('準備中', 'Coming soon')}</span>
					{/if}
				</li>
			{:else}
				<li class="none" role="presentation">{t('見つかりません。', 'No match.')}</li>
			{/each}
		</ul>
	{/if}

	{#if picked}
		<p class="notice" role="status">
			{t(`${picked.name}の議会は、まだ対応していません。`, `${label(picked)} isn't covered yet.`)}
			{#if REGION_REQUEST_URL}
				<a class="text-link" href={REGION_REQUEST_URL} target="_blank" rel="noopener external"
					>{t('対応してほしい地域を伝える', 'Ask us to cover it')}<Icon name="right" /></a
				>
			{/if}
		</p>
	{/if}
</div>

<style>
	.rs {
		position: relative;
		max-width: 460px;
	}

	.box {
		display: flex;
		align-items: center;
		gap: 10px;
		height: 54px;
		padding: 0 16px;
		background: var(--color-surface);
		border: 1.5px solid var(--color-ink);
		box-shadow: 3px 3px 0 var(--color-ink);
	}

	.box:focus-within {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.box :global(svg) {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		color: var(--color-text-muted);
	}

	input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: transparent;
		/* 16px keeps iOS from zooming the page on focus */
		font-size: 16px;
		height: 100%;
	}

	input:focus-visible {
		outline: none;
	}

	input::placeholder {
		color: var(--color-text-muted);
	}

	.list {
		position: absolute;
		z-index: 20;
		left: 0;
		right: 0;
		top: calc(100% + 8px);
		margin: 0;
		padding: 0;
		list-style: none;
		background: var(--color-surface);
		border: 1.5px solid var(--color-ink);
		box-shadow: 3px 3px 0 var(--color-ink);
		max-height: 320px;
		overflow-y: auto;
	}

	.list li {
		display: flex;
		align-items: baseline;
		gap: 10px;
		padding: 12px 16px;
		cursor: pointer;
		border-bottom: 1px solid var(--color-border);
	}

	.list li:last-child {
		border-bottom: 0;
	}

	.list li.active {
		background: var(--color-hover);
	}

	.name {
		font-weight: 700;
	}

	.pref {
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.go,
	.soon {
		margin-left: auto;
		align-self: center;
	}

	.go :global(svg) {
		width: 16px;
		height: 16px;
		color: var(--color-primary);
	}

	.soon {
		font-size: 12px;
		font-weight: 700;
		color: var(--color-text-muted);
		background: var(--color-surface-alt);
		padding: 2px 8px;
	}

	.list li.none {
		cursor: default;
		color: var(--color-text-muted);
	}

	.notice {
		margin-top: 12px;
		font-size: 14px;
		color: var(--color-text-muted);
		display: flex;
		flex-wrap: wrap;
		gap: 4px 14px;
	}
</style>
