<script>
	import { t, href } from '$lib/i18n.js';

	/** @type {{ title: string, text?: string, children?: import('svelte').Snippet }} */
	let { title, text, children } = $props();
</script>

<svelte:head>
	<title>{title}（{t('準備中', 'coming soon')}） — Polic</title>
</svelte:head>

<div class="container page">
	<div class="page-head"><h1>{title}</h1></div>
	<div class="soon-panel">
		<h2>{t('このページは準備中です', 'This page is coming soon')}</h2>
		{#if text}<p>{text}</p>{/if}
		<div class="row">
			{#if children}{@render children()}{:else}<a class="btn btn-ghost" href={href('/')}>{t('トップへ戻る', 'Back to home')}</a>{/if}
		</div>
	</div>
</div>

<style>
	.soon-panel {
		margin: 20px 0 64px;
		padding: 32px;
		background: var(--color-surface);
		border: 1.5px dashed var(--color-ink);
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: flex-start;
	}

	.soon-panel h2 {
		font-size: 20px;
	}

	.soon-panel p {
		color: var(--color-text-muted);
	}

	.row {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		margin-top: 6px;
	}

	@media (max-width: 760px) {
		.soon-panel {
			padding: 22px;
		}
	}
</style>
