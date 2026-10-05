<script>
	// Home page map: Kanto's municipalities from 国土数値情報 (built by scripts/map.js). Clicking Tokyo zooms in,
	// where each covered ward or city links to its board. Uncovered places are shown but not clickable.
	import map from '$lib/map/kanto.json';
	import { t, href } from '$lib/i18n.js';
	import Icon from './Icon.svelte';

	/** @type {{ assemblies: import('$lib/bills.js').PublicAssembly[] }} */
	let { assemblies } = $props();

	const prefOf = (/** @type {import('$lib/bills.js').PublicAssembly} */ a) => assemblies.find((p) => p.id === a.parent)?.place ?? '';
	const covered = $derived(new Map(assemblies.filter((a) => a.level === 'muni').map((a) => [`${prefOf(a)}/${a.place}`, a])));
	const metro = $derived(assemblies.find((a) => a.level === 'pref' && a.place === '東京都'));

	let zoomed = $state(false);
	/** @type {{ name: string, covered: boolean } | null} */
	let hover = $state(null);

	// Fit the Tokyo frame into the map's box, centred.
	const [tx, ty, tw, th] = map.tokyo;
	const k = Math.min(map.width / tw, map.height / th);
	const zoom = `translate(${map.width / 2 - k * (tx + tw / 2)}px, ${map.height / 2 - k * (ty + th / 2)}px) scale(${k})`;

	const keyOf = (/** @type {{ pref: string, name?: string }} */ s) => `${s.pref}/${s.name}`;
	const nameOf = (/** @type {{ name?: string }} */ s, /** @type {import('$lib/bills.js').PublicAssembly | undefined} */ a) =>
		a ? t(a.place, a.placeEn) : (s.name ?? '');

	function zoomIn() {
		zoomed = true;
		hover = null;
	}
</script>

<div class="kmap">
	<div class="bar">
		{#if zoomed}
			<button type="button" class="kbtn" onclick={() => ((zoomed = false), (hover = null))}><Icon name="left" />{t('関東全体', 'All of Kanto')}</button>
			{#if metro}<a class="kbtn" href={href(`/${metro.id}`)}>{t(metro.name, metro.nameEn)}<Icon name="right" /></a>{/if}
		{:else}
			<button type="button" class="kbtn" onclick={zoomIn}>{t('東京都を拡大', 'Zoom in on Tokyo')}<Icon name="search" /></button>
		{/if}
	</div>

	<svg viewBox="0 0 {map.width} {map.height}" role="group" aria-label={t('関東の市区町村の地図', 'Map of municipalities in Kanto')}>
		<g class="world" style:transform={zoomed ? zoom : 'none'}>
			{#each map.shapes as s, i (i)}
				{@const a = s.name ? covered.get(keyOf(s)) : undefined}
				{#if zoomed && a}
					<a
						href={href(`/${a.id}`)}
						aria-label={t(`${a.place}の議案`, `Bills in ${a.placeEn}`)}
						onmouseenter={() => (hover = { name: nameOf(s, a), covered: true })}
						onmouseleave={() => (hover = null)}
						onfocus={() => (hover = { name: nameOf(s, a), covered: true })}
						onblur={() => (hover = null)}
					>
						<path class="muni on link" d={s.d} />
					</a>
				{:else}
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
					<path
						class="muni"
						class:on={!!a}
						class:tokyo={!zoomed && s.pref === '東京都'}
						d={s.d}
						onclick={!zoomed && s.pref === '東京都' ? zoomIn : undefined}
						onmouseenter={() => s.name && (hover = { name: s.name, covered: !!a })}
						onmouseleave={() => (hover = null)}
					/>
				{/if}
			{/each}
			{#each map.prefs as p (p.pref)}
				<path class="pref" d={p.d} />
			{/each}
		</g>
	</svg>

	<p class="caption" aria-live="polite">
		{#if hover}
			<b>{hover.name}</b>{hover.covered ? (zoomed ? t(' — 議案を見る', ' — see bills') : '') : t('（未対応）', ' (not covered yet)')}
		{:else if zoomed}
			{t('色のついた市区町村を選んでください', 'Pick a highlighted ward or city')}
		{:else}
			{t('東京都を選ぶと拡大します', 'Select Tokyo to zoom in')}
		{/if}
	</p>
	<p class="credit">{t('島しょ部は省略。出典：', 'Islands omitted. Source: ')}{map.source}{t('を加工して作成', ', processed by Polic')}</p>
</div>

<style>
	.kmap {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		min-height: 32px;
		font-size: 13px;
	}

	.kbtn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		height: 32px;
		padding: 0 10px;
		font: inherit;
		line-height: 1;
		font-weight: 700;
		color: var(--color-text);
		background: var(--color-surface);
		border: 1px solid var(--color-border-strong);
		text-decoration: none;
		cursor: pointer;
	}

	.kbtn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.bar :global(svg) {
		width: 14px;
		height: 14px;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: hidden;
	}

	.world {
		transform-origin: 0 0;
		transform-box: view-box;
		transition: transform 0.5s var(--ease);
	}

	.muni {
		fill: var(--color-surface-alt);
		stroke: var(--color-border-strong);
		stroke-width: 0.5px;
		vector-effect: non-scaling-stroke;
		stroke-linejoin: round;
	}

	.muni.on {
		fill: color-mix(in srgb, var(--color-primary) 38%, var(--color-surface-alt));
	}

	.muni.tokyo {
		cursor: zoom-in;
	}

	.world:has(.tokyo:hover) .tokyo,
	.muni.link:hover,
	a:focus-visible .muni.link {
		fill: var(--color-primary);
	}

	a:focus-visible {
		outline: none;
	}

	.pref {
		fill: none;
		stroke: var(--color-ink);
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
		stroke-linejoin: round;
		pointer-events: none;
	}

	.caption {
		min-height: 1.6em;
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.caption b {
		color: var(--color-text);
	}

	.credit {
		font-size: 11px;
		line-height: 1.5;
		color: var(--color-text-muted);
	}
</style>
