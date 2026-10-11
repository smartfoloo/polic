<script>
	// Home page map: Kanto's municipalities from 国土数値情報 (built by scripts/map.js). Clicking a prefecture with
	// live assemblies zooms in, where each covered ward or city links to its board. Uncovered places are shown but
	// not clickable.
	import map from '$lib/map/kanto.json';
	import { t, href } from '$lib/i18n.js';
	import Icon from './Icon.svelte';

	/** @type {{ assemblies: import('$lib/bills.js').PublicAssembly[] }} */
	let { assemblies } = $props();

	const covered = $derived(new Map(assemblies.filter((a) => a.level === 'muni').map((a) => [`${a.pref}/${a.place}`, a])));
	// Prefectures that can be zoomed into: those with a live assembly, in the order the config lists them.
	const zoomable = $derived([...new Set(assemblies.map((a) => a.pref))].map((pref) => ({ pref, prefEn: assemblies.find((a) => a.pref === pref)?.prefEn ?? pref })));
	const prefAssembly = $derived(assemblies.find((a) => a.level === 'pref' && a.place === zoomed));

	/** The prefecture zoomed into, or null for the whole map. */
	let zoomed = $state(/** @type {string | null} */ (null));
	/** @type {{ name: string, covered: boolean } | null} */
	let hover = $state(null);
	/** The zoomable prefecture under the pointer, lit as a whole. */
	let hoverPref = $state(/** @type {string | null} */ (null));

	const FULL = [0, 0, map.width, map.height];
	// Zoomed frame: the prefecture's mainland municipalities, plus 1.5 km.
	function frame(/** @type {string} */ pref) {
		const boxes = map.shapes.filter((s) => s.pref === pref && s.name).map((s) => s.box);
		const x = Math.min(...boxes.map((b) => b[0])) - 15;
		const y = Math.min(...boxes.map((b) => b[1])) - 15;
		return [x, y, Math.max(...boxes.map((b) => b[0] + b[2])) + 15 - x, Math.max(...boxes.map((b) => b[1] + b[3])) + 15 - y];
	}
	const canZoom = (/** @type {string} */ pref) => zoomable.some((z) => z.pref === pref);

	let vb = $state(FULL);
	/** @type {number} */
	let raf;
	function animateTo(/** @type {number[]} */ to) {
		cancelAnimationFrame(raf);
		const from = vb;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return void (vb = to);
		const start = performance.now();
		const step = (/** @type {number} */ now) => {
			const p = Math.min(1, (now - start) / 450);
			const e = 1 - (1 - p) ** 3;
			vb = from.map((v, i) => v + (to[i] - v) * e);
			if (p < 1) raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
	}

	const keyOf = (/** @type {{ pref: string, name?: string }} */ s) => `${s.pref}/${s.name}`;
	const nameOf = (/** @type {{ name?: string }} */ s, /** @type {import('$lib/bills.js').PublicAssembly | undefined} */ a) =>
		a ? t(a.place, a.placeEn) : (s.name ?? '');

	function zoomIn(/** @type {string} */ pref) {
		zoomed = pref;
		hover = null;
		hoverPref = null;
		animateTo(frame(pref));
	}

	function zoomOut() {
		zoomed = null;
		hover = null;
		animateTo(FULL);
	}
</script>

<div class="kmap">
	<div class="bar">
		{#if zoomed}
			<button type="button" class="kbtn" onclick={zoomOut}><Icon name="left" />{t('全体を表示', 'Show all')}</button>
			{#if prefAssembly}<a class="kbtn" href={href(`/${prefAssembly.id}`)}>{t(prefAssembly.name, prefAssembly.nameEn)}<Icon name="right" /></a>{/if}
		{:else}
			<span class="zooms">
				{#each zoomable as z (z.pref)}
					<button type="button" class="kbtn" onclick={() => zoomIn(z.pref)}>{t(`${z.pref}を拡大`, `Zoom in on ${z.prefEn}`)}<Icon name="search" /></button>
				{/each}
			</span>
		{/if}
	</div>

	<svg class="map" viewBox={vb.join(' ')} role="group" aria-label={t('関東の市区町村の地図', 'Map of municipalities in Kanto')}>
		<g class="world">
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
						class:zoomable={!zoomed && canZoom(s.pref)}
						class:lit={!zoomed && hoverPref === s.pref}
						d={s.d}
						onclick={!zoomed && canZoom(s.pref) ? () => zoomIn(s.pref) : undefined}
						onmouseenter={() => {
							if (s.name) hover = { name: s.name, covered: !!a };
							hoverPref = canZoom(s.pref) ? s.pref : null;
						}}
						onmouseleave={() => ((hover = null), (hoverPref = null))}
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
			<b>{hover.name}</b>{hover.covered ? (zoomed ? t('：議案を見る', ': see bills') : '') : t('（未対応）', ' (not covered yet)')}
		{:else if zoomed}
			{t('色のついた市区町村を選んでください', 'Pick a highlighted ward or city')}
		{:else}
			{zoomable.length === 1
				? t(`${zoomable[0].pref}を選ぶと拡大します`, `Select ${zoomable[0].prefEn} to zoom in`)
				: t('色のついた都県を選ぶと拡大します', 'Select a highlighted prefecture to zoom in')}
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

	.zooms {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.bar :global(svg) {
		width: 14px;
		height: 14px;
	}

	.map {
		display: block;
		width: 100%;
		height: 330px;
		overflow: hidden;
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

	.muni.zoomable {
		cursor: zoom-in;
	}

	.muni.lit,
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
