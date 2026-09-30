<script>
	import '@fontsource/noto-serif-jp/700.css';
	import '@fontsource-variable/source-serif-4/wght.css';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { t, otherLangPath, isEn } from '$lib/i18n.js';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import RegionPicker from '$lib/components/RegionPicker.svelte';

	let { data, children } = $props();

	// The review page (/admin, dev only) is a full-screen tool without the site's header and footer.
	const admin = $derived(page.route.id?.startsWith('/admin') ?? false);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="alternate" hreflang={isEn() ? 'ja' : 'en'} href={otherLangPath(page.url.pathname)} />
	<meta name="description" content={t('地元の議会で決まっていることを、ふだんの言葉で。', 'What your local assembly is deciding, in everyday words.')} />
</svelte:head>

{#if admin}
	{@render children()}
{:else}
	<a class="skip sr" href="#main">{t('本文へ移動', 'Skip to content')}</a>
	<SiteHeader />
	<main id="main" tabindex="-1">
		{@render children()}
	</main>
	<SiteFooter contact={data.contact} />
	<RegionPicker assemblies={data.assemblies} />
{/if}

<style>
	main {
		min-height: 60vh;
		outline: none;
	}

	.skip:focus {
		position: fixed;
		z-index: 100;
		top: 8px;
		left: 8px;
		width: auto;
		height: auto;
		clip: auto;
		padding: 8px 14px;
		background: var(--color-surface);
		border: 1.5px solid var(--color-ink);
	}
</style>
