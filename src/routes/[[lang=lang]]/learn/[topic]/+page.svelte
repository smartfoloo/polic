<script>
	import { t, href, isEn } from '$lib/i18n.js';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();

	const lang = $derived(isEn() ? 'en' : 'ja');
	const x = $derived(data.topic[lang]);
</script>

<svelte:head>
	<title>{x.title} — {t('学ぶ', 'Learn')} — Polic</title>
	<meta name="description" content={x.desc} />
</svelte:head>

<div class="container narrow article">
	<a class="back" href={href('/learn')}><Icon name="left" />{t('学ぶ', 'Learn')}</a>
	<div class="page-head"><h1>{x.title}</h1></div>
	<p class="lead">{x.lead}</p>

	{#each x.body as block, i (i)}
		{#if typeof block === 'string'}
			<p>{block}</p>
		{:else if 'steps' in block}
			<ol class="steps">
				{#each block.steps as [label, text] (label)}
					<li><b>{label}</b><span>{text}</span></li>
				{/each}
			</ol>
		{:else}
			<dl class="items">
				{#each block.items as [label, text] (label)}
					<div><dt>{label}</dt><dd>{text}</dd></div>
				{/each}
			</dl>
		{/if}
	{/each}

	<a class="next" href={href(`/learn/${data.next.slug}`)}>
		<span><small>{t('次を読む', 'Read next')}</small><b>{data.next[lang].title}</b></span>
		<Icon name="right" />
	</a>
</div>

<style>
	.article {
		padding-bottom: 64px;
	}

	.page-head {
		padding-top: 14px;
	}

	.lead {
		font-size: 17px;
		line-height: 1.85;
		margin-top: 8px;
	}

	p,
	.steps,
	.items {
		margin-top: 16px;
		line-height: 1.9;
	}

	.steps {
		list-style: none;
		padding: 0;
		counter-reset: s;
	}

	.steps li {
		counter-increment: s;
		position: relative;
		padding: 0 0 20px 48px;
		animation: rise 0.4s var(--ease) both;
	}

	.steps li:nth-child(2) {
		animation-delay: 60ms;
	}

	.steps li:nth-child(3) {
		animation-delay: 120ms;
	}

	.steps li:nth-child(4) {
		animation-delay: 180ms;
	}

	.steps li:nth-child(5) {
		animation-delay: 240ms;
	}

	.steps li::before {
		content: counter(s);
		position: absolute;
		left: 0;
		top: 0;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: var(--color-primary);
		color: var(--color-on-primary);
		font-weight: 800;
		font-size: 14px;
	}

	.steps li::after {
		content: '';
		position: absolute;
		left: 15px;
		top: 36px;
		bottom: 4px;
		width: 2px;
		background: var(--color-border-strong);
	}

	.steps li:last-child {
		padding-bottom: 0;
	}

	.steps li:last-child::after {
		display: none;
	}

	.steps b,
	.items dt {
		display: block;
		font-size: 16px;
		font-weight: 700;
	}

	.steps span,
	.items dd {
		color: var(--color-text-muted);
	}

	.items {
		display: grid;
		gap: 10px;
	}

	.items div {
		padding: 14px 16px;
		background: var(--color-surface);
		border: 1.5px solid var(--color-ink);
	}

	.items dd {
		margin: 2px 0 0;
		line-height: 1.75;
	}

	.next {
		margin-top: 40px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		padding: 18px 20px;
		background: var(--color-surface);
		border: 1.5px solid var(--color-ink);
		color: var(--color-text);
		transition:
			transform 0.15s var(--ease),
			box-shadow 0.15s var(--ease);
	}

	.next:hover {
		text-decoration: none;
		transform: translate(-2px, -2px);
		box-shadow: 5px 5px 0 var(--color-ink);
	}

	.next small {
		display: block;
		color: var(--color-text-muted);
		font-size: 12.5px;
	}

	.next b {
		font-size: 16px;
	}

	.next :global(svg) {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		color: var(--color-primary);
		transition: transform 0.15s var(--ease);
	}

	.next:hover :global(svg) {
		transform: translateX(4px);
	}
</style>
