<script>
	import { page } from '$app/state';
	import { t, href, isEn, otherLangPath } from '$lib/i18n.js';

	/** @type {{ contact: string }} */
	let { contact } = $props();
</script>

<footer class="site-foot">
	<div class="container">
		<div class="foot-grid">
			<div>
				<a class="brand" href={href('/')}>Polic</a>
				<p>{t('Polic は、地元の議会への関心を広げるための、非営利プロジェクトです。', 'Polic is a non-profit project to get more people interested in their local assembly.')}</p>
			</div>
			<nav class="foot-nav" aria-label={t('フッター', 'Footer')}>
				<a href={href('/about')}>About</a>
				<a href={href('/about#corrections')}>{t('訂正ポリシー', 'Corrections policy')}</a>
				<a href={href('/privacy')}>{t('プライバシーポリシー', 'Privacy policy')}</a>
				<a href="mailto:{contact}">{t('お問い合わせ', 'Contact')}</a>
				<a href={href('/join')}>{t('参加する', 'Get involved')}</a>
				<a href={href('/learn')}>{t('学ぶ', 'Learn')}</a>
			</nav>
		</div>
		<div class="foot-bottom">
			<p class="foot-note">
				{t(
					'議会の公式サイトではありません。正確な内容は、各議会の原文をご確認ください。',
					"This is not an official assembly website. For the exact wording, see each assembly's original documents."
				)}
			</p>
			<a class="lang" href={otherLangPath(page.url.pathname)} hreflang={isEn() ? 'ja' : 'en'} lang={isEn() ? 'ja' : 'en'}>
				{isEn() ? '日本語' : 'English'}
			</a>
		</div>
	</div>
</footer>

<style>
	.site-foot {
		background: var(--color-background);
		border-top: 3px double var(--color-ink);
		padding: 36px 0 28px;
	}

	.foot-grid {
		display: flex;
		justify-content: space-between;
		gap: 24px 40px;
		flex-wrap: wrap;
	}

	.brand {
		color: var(--color-text);
		font-family: var(--font-logo);
		font-weight: 700;
		font-size: 28px;
		line-height: 1;
	}

	.brand:hover {
		text-decoration: none;
	}

	.foot-grid p {
		color: var(--color-text-muted);
		font-size: 14px;
		margin-top: 10px;
		max-width: 26em;
	}

	.foot-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 20px;
		align-content: flex-start;
	}

	.foot-nav a,
	.lang {
		color: var(--color-text-muted);
		font-size: 14px;
		font-weight: 700;
	}

	.foot-nav a:hover,
	.lang:hover {
		color: var(--color-text);
	}

	.foot-bottom {
		margin-top: 24px;
		padding-top: 16px;
		border-top: 1px solid var(--color-ink);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px 20px;
	}

	.foot-note {
		font-size: 12.5px;
		color: var(--color-text-muted);
	}

	.lang {
		font-size: 12.5px;
	}
</style>
