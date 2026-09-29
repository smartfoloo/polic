<script>
	import { page } from '$app/state';
	import { t, href } from '$lib/i18n.js';
	import Icon from './Icon.svelte';

	const current = $derived(page.params.assembly ?? 'tokyo');
	const route = $derived(page.route.id ?? '');
	const active = $derived(
		route.includes('/meetings')
			? 'meetings'
			: route.includes('[...assembly')
				? 'bills'
				: route.endsWith('/learn')
					? 'learn'
					: route.endsWith('/search')
						? 'search'
						: route.endsWith('/about')
							? 'about'
							: null
	);
	/** @param {string} key */
	const cur = (key) => (active === key ? 'page' : undefined);
</script>

<header class="site-head">
	<div class="container head-inner">
		<a class="brand" href={href('/')} aria-label={t('Polic トップ', 'Polic home')}>Polic</a>
		<nav class="head-nav" aria-label={t('メイン', 'Main')}>
			<a href={href(`/${current}`)} class="nav-link" aria-current={cur('bills')} aria-label={t('政策と提案', 'Policies and proposals')}>
				<Icon name="doc" /><span>{t('政策と提案', 'Policies and proposals')}</span>
			</a>
			<a href={href(`/${current}/meetings`)} class="nav-link" aria-current={cur('meetings')} aria-label={t('会議の記録', 'Meeting records')}>
				<Icon name="clock" /><span>{t('会議の記録', 'Meeting records')}</span>
			</a>
			<a href={href('/learn')} class="nav-link" aria-current={cur('learn')} aria-label={t('学ぶ', 'Learn')}>
				<Icon name="book" /><span>{t('学ぶ', 'Learn')}</span>
			</a>
			<a href={href('/search')} class="icon-btn" aria-current={cur('search')} aria-label={t('検索', 'Search')}><Icon name="search" /></a>
			<a href={href('/about')} class="icon-btn" aria-current={cur('about')} aria-label={t('Policについて', 'About Polic')}><Icon name="info" /></a>
		</nav>
	</div>
</header>

<style>
	.site-head {
		position: sticky;
		top: 0;
		z-index: 40;
		height: var(--header-h);
		background: var(--color-background);
		border-bottom: 1px solid var(--color-border);
	}

	.head-inner {
		height: 100%;
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.brand {
		color: var(--color-text);
		font-family: var(--font-logo);
		font-weight: 700;
		font-size: 28px;
		line-height: 1;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.brand:hover {
		text-decoration: none;
	}

	.head-nav {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.head-nav a[aria-current='page'] {
		color: var(--color-primary);
	}

	.nav-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 36px;
		padding: 0 12px;
		font-size: 13px;
		font-weight: 700;
		color: var(--color-text-muted);
		white-space: nowrap;
		transition: color 0.15s;
	}

	.nav-link:hover {
		color: var(--color-text);
		text-decoration: none;
	}

	.nav-link :global(svg) {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	@media (max-width: 900px) {
		.nav-link {
			width: 36px;
			padding: 0;
			justify-content: center;
			flex-shrink: 0;
		}

		.nav-link span {
			display: none;
		}
	}

	@media (max-width: 760px) {
		.brand {
			font-size: 24px;
		}
	}
</style>
