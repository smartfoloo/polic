<script>
	import { t, isEn } from '$lib/i18n.js';

	let { data } = $props();
	const mail = $derived(data.contact);
</script>

<svelte:head>
	<title>{t('プライバシーポリシー', 'Privacy policy')} — Polic</title>
</svelte:head>

<div class="container narrow article">
	<div class="page-head">
		<h1>{t('プライバシーポリシー', 'Privacy policy')}</h1>
		<p>{t('最終更新：2026年9月29日', 'Last updated: September 29, 2026')}</p>
	</div>

	{#if isEn()}
		<section>
			<h2>Who runs this site</h2>
			<p>Polic is an informal group run by volunteers. Contact: <a href="mailto:{mail}">{mail}</a></p>
		</section>
		<section>
			<h2>What we collect</h2>
			<p>This site has no accounts, cookies, ads or analytics tools, and loads nothing from other services. Like most websites, our server keeps an access log: IP address, browser type, time and the page requested.</p>
		</section>
		<section>
			<h2>Counting views</h2>
			<p>When you open a bill, your browser sends one request so we can count views. From the access log we count how many different visitors viewed each bill per day; the IP address and browser type are hashed and used only for that count. We keep only the totals, and delete access logs within 14 days. The totals are used only for the "Most viewed" list, and are never shown as numbers.</p>
		</section>
		<section>
			<h2>How AI is used</h2>
			<p>Summaries are written by sending bills and documents published by the assembly and city to the OpenAI API (United States). We send only these public documents, never anything about visitors to this site. We leave out bills likely to contain personal information, such as lawsuits, settlements and appointments. OpenAI states that data sent to its API is not used for training and is kept for up to 30 days for abuse monitoring (as of September 2026).</p>
		</section>
		<section>
			<h2>Corrections and removal</h2>
			<p>If something is wrong, or you want information removed, email <a href="mailto:{mail}">{mail}</a>.</p>
		</section>
		<section>
			<h2>Changes</h2>
			<p>If this policy changes, we update this page and its date.</p>
		</section>
	{:else}
		<section>
			<h2>運営者</h2>
			<p>Polic（ボランティアが運営する任意団体）。連絡先：<a href="mailto:{mail}">{mail}</a></p>
		</section>
		<section>
			<h2>集める情報</h2>
			<p>このサイトには、アカウント、Cookie、広告、アクセス解析ツールはなく、ほかのサービスからは何も読み込みません。ふつうのウェブサイトと同じように、サーバーはアクセスログ（IPアドレス、ブラウザの種類、日時、見たページ）を記録します。</p>
		</section>
		<section>
			<h2>閲覧数の集計</h2>
			<p>議案を開くと、閲覧を数えるための通信が1回送られます。アクセスログから、議案ごと・日ごとに何人が見たかを数えます。IPアドレスとブラウザの種類はハッシュ化し、この集計だけに使います。残すのは集計した数だけで、アクセスログは14日以内に消します。集計は「よく見られている」の表示だけに使い、数そのものは表示しません。</p>
		</section>
		<section>
			<h2>AIの利用</h2>
			<p>要約は、議会や自治体が公開した議案と資料を、OpenAI（米国）のAPIに送って作っています。送るのは公開資料だけで、サイトを見た人の情報は送りません。訴訟・和解・人事など、個人の情報を含みやすい議案は対象外にしています。OpenAIは、APIに送られたデータを学習に使わず、不正利用の監視のため最大30日保存するとしています（2026年9月時点）。</p>
		</section>
		<section>
			<h2>訂正と削除の依頼</h2>
			<p>内容のまちがいや、掲載をやめてほしい情報があれば、<a href="mailto:{mail}">{mail}</a> までご連絡ください。</p>
		</section>
		<section>
			<h2>改定</h2>
			<p>このポリシーを変えたときは、このページと日付を更新します。</p>
		</section>
	{/if}
</div>

<style>
	.article {
		padding-bottom: 64px;
	}

	section {
		padding: 22px 0;
		border-top: 1px solid var(--color-border-strong);
	}

	h2 {
		font-size: 18px;
		margin-bottom: 8px;
	}
</style>
