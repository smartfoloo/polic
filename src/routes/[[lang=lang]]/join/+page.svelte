<script>
	import { t } from '$lib/i18n.js';
	import { JOIN_FORM_URL } from '$lib/config/site.js';
	import SoonPanel from '$lib/components/SoonPanel.svelte';
	import Icon from '$lib/components/Icon.svelte';
</script>

<!-- Links go straight to the form once it's set; this page only catches old or typed URLs. -->
<svelte:head>
	{#if JOIN_FORM_URL}<title>{t('参加する', 'Get involved')} — Polic</title>{/if}
</svelte:head>

{#if JOIN_FORM_URL}
	<div class="container narrow">
		<div class="page-head">
			<h1>{t('参加する', 'Get involved')}</h1>
			<p>{t('参加の申し込みは、Googleフォームで受け付けています。', 'We take sign-ups through a Google Form.')}</p>
		</div>
		<p class="row">
			<a class="btn btn-primary" href={JOIN_FORM_URL} target="_blank" rel="noopener external">{t('フォームを開く', 'Open the form')}<Icon name="right" /></a>
		</p>
	</div>
{:else}
	<SoonPanel title={t('参加する', 'Get involved')} />
{/if}

<style>
	.row {
		padding: 20px 0 64px;
	}
</style>
