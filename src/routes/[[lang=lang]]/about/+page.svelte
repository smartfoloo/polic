<script>
	import { t, href, isEn } from '$lib/i18n.js';

	let { data } = $props();

	const steps = $derived([
		{ k: '01', title: t('公式の資料を集める', 'Collect official documents'), text: t('議会と自治体が公開した議案と資料だけ。', 'Only bills and documents published by the assembly and city.') },
		{ k: '02', title: t('AIが下書き', 'AI writes a draft'), text: t('自分の言葉で、中立に。', 'In its own words, neutrally.') },
		{ k: '03', title: t('自動でチェック', 'Automatic checks'), text: t('数字や変更の向きを原文と照らし合わせる。', 'Numbers and the direction of changes are compared with the source.') },
		{ k: '04', title: t('人が確認', 'A person reviews'), text: t('問題が見つかったもの、議員の提案、選挙の時期はすべて。', "Anything flagged, members' bills, and everything near an election."), human: true },
		{ k: '05', title: t('出典つきで公開', 'Published with sources'), text: t('人がまだ確認していない要約には、そう書きます。', "Summaries a person hasn't checked yet say so.") }
	]);
</script>

<svelte:head>
	<title>{t('Policについて', 'About Polic')} — Polic</title>
</svelte:head>

<div class="container narrow article">
	<div class="page-head"><h1>{t('Policについて', 'About Polic')}</h1></div>

	<section id="mission">
		<p>
			{t(
				'地元で何が決まっているかを、だれでも3分でわかるように。非営利のプロジェクトです。広告はありません。',
				'So anyone can understand what their town is deciding in three minutes. Polic is a non-profit project. There are no ads.'
			)}
		</p>
	</section>

	<section id="process">
		<h2>{t('要約ができるまで', 'How a summary is made')}</h2>
		<ol class="process">
			{#each steps as s (s.k)}
				<li class:human={s.human}><span class="k">{s.k}</span><b>{s.title}</b><span>{s.text}</span></li>
			{/each}
		</ol>
	</section>

	<section id="neutral">
		<h2>{t('中立', 'Neutrality')}</h2>
		<p>{t('どの政党も支持せず、賛成・反対もすすめません。', 'We support no party and never tell you to be for or against anything.')}</p>
		<p>
			{t(
				'議案の並び順は、審議の状況と日付だけで決めています。議案の題名・番号・結果・日付は、AIではなく議会の資料からそのまま取っています。',
				"Bills are ordered only by where they are in the process and by date. Titles, numbers, results and dates are taken directly from the assembly's documents, not written by AI."
			)}
		</p>
	</section>

	<section id="corrections">
		<h2>{t('まちがいを見つけたら', 'If you find a mistake')}</h2>
		{#if isEn()}
			<p>Use "Report an error" on the bill, or email <a href="mailto:{data.contact}">{data.contact}</a>. We check it, fix it, and keep a record of the change.</p>
		{:else}
			<p>各議案の「誤りを報告する」か、メール（<a href="mailto:{data.contact}">{data.contact}</a>）で教えてください。確認して直し、記録を残します。</p>
		{/if}
	</section>

	<section id="privacy">
		<h2>{t('プライバシー', 'Privacy')}</h2>
		<p>
			{t('アカウント、Cookie、広告、アクセス解析はありません。', 'No accounts, cookies, ads or analytics.')}
			<a href={href('/privacy')}>{t('プライバシーポリシー', 'Privacy policy')}</a>
		</p>
	</section>
</div>

<style>
	.article {
		padding-bottom: 64px;
	}

	section {
		padding: 28px 0;
		border-top: 1px solid var(--color-border-strong);
	}

	section:first-of-type {
		border-top: 0;
	}

	h2 {
		font-size: 20px;
		margin-bottom: 10px;
	}

	p + p {
		margin-top: 10px;
	}

	.process {
		list-style: none;
		margin: 18px 0 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 10px;
	}

	.process li {
		padding: 14px;
		background: var(--color-surface);
		border: 1.5px solid var(--color-ink);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.process .k {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--color-primary);
		font-weight: 700;
	}

	.process b {
		font-size: 15px;
		line-height: 1.45;
	}

	.process span:last-child {
		font-size: 13px;
		color: var(--color-text-muted);
		line-height: 1.6;
	}

	.process li.human {
		border-color: var(--color-primary);
		background: var(--color-primary-soft);
	}

	@media (max-width: 900px) {
		.process {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.process li:last-child {
			grid-column: 1 / -1;
		}
	}
</style>
