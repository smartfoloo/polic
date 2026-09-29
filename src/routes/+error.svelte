<script>
	import { page } from '$app/state';
	import { t, href } from '$lib/i18n.js';
</script>

<svelte:head>
	<title>{page.status === 404 ? t('ページが見つかりません', 'Page not found') : t('エラーが起きました', 'Something went wrong')} — Polic</title>
</svelte:head>

<div class="container narrow">
	<div class="page-head">
		<h1>{page.status === 404 ? t('ページが見つかりません', 'Page not found') : t('エラーが起きました', 'Something went wrong')}</h1>
		<p>{t('議案は、確認が終わるまで表示されないことがあります。', 'Some bills are not shown until they have been checked.')}</p>
	</div>
	<p class="back-row"><a class="btn btn-primary" href={href('/')}>{t('トップへ戻る', 'Back to home')}</a></p>
</div>

<style>
	.back-row {
		padding: 20px 0 64px;
	}
</style>
