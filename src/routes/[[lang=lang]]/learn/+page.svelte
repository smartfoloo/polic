<script>
	import { t, href, isEn } from '$lib/i18n.js';
	import { groups, topics } from '$lib/learn.js';
	import Icon from '$lib/components/Icon.svelte';

	const lang = $derived(isEn() ? 'en' : 'ja');
</script>

<svelte:head>
	<title>{t('学ぶ', 'Learn')} — Polic</title>
	<meta name="description" content={t('地方自治と議会のしくみを、短く説明します。', 'Short explainers on how local government and assemblies work.')} />
</svelte:head>

<div class="container learn">
	<div class="page-head">
		<h1>{t('学ぶ', 'Learn')}</h1>
		<p>{t('地方自治と議会のしくみを、短く説明します。', 'Short explainers on how local government and assemblies work.')}</p>
	</div>

	{#each Object.entries(groups) as [id, g] (id)}
		<section>
			<h2>{g[lang]}</h2>
			<div class="grid">
				{#each topics.filter((x) => x.group === id) as x (x.slug)}
					{@const n = topics.indexOf(x)}
					<a class="card" href={href(`/learn/${x.slug}`)} style:--i={n}>
						<span class="k">{String(n + 1).padStart(2, '0')}</span>
						<h3>{x[lang].title}<Icon name="right" /></h3>
						<p>{x[lang].desc}</p>
					</a>
				{/each}
			</div>
		</section>
	{/each}
</div>

<style>
	.learn {
		padding-bottom: 64px;
	}

	section {
		margin-top: 28px;
	}

	h2 {
		font-size: 20px;
		margin-bottom: 14px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 14px;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 20px;
		background: var(--color-surface);
		border: 1.5px solid var(--color-ink);
		color: var(--color-text);
		animation: rise 0.4s var(--ease) both;
		animation-delay: calc(var(--i) * 40ms);
		transition:
			transform 0.15s var(--ease),
			box-shadow 0.15s var(--ease);
	}

	.card:hover {
		text-decoration: none;
		transform: translate(-2px, -2px);
		box-shadow: 5px 5px 0 var(--color-ink);
	}

	.k {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 700;
		color: var(--color-primary);
	}

	h3 {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 17px;
	}

	h3 :global(svg) {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
		color: var(--color-primary);
		transition: transform 0.15s var(--ease);
	}

	.card:hover h3 :global(svg) {
		transform: translateX(3px);
	}

	.card p {
		color: var(--color-text-muted);
		font-size: 14px;
		line-height: 1.6;
	}
</style>
