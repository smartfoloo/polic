<script>
	import { t, href } from '$lib/i18n.js';
	import BillCard from '$lib/components/BillCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import KantoMap from '$lib/components/KantoMap.svelte';
	import RegionSearch from '$lib/components/RegionSearch.svelte';
	import { JOIN_FORM_URL } from '$lib/config/site.js';

	let { data } = $props();

	const byId = (/** @type {string} */ id) => /** @type {import('$lib/bills.js').PublicAssembly} */ (data.assemblies.find((a) => a.id === id));

</script>

<svelte:head>
	<title>Polic — {t('地元の政策を、ふだんの言葉で', 'Local policy, in everyday words')}</title>
</svelte:head>

<section class="hero">
	<div class="container hero-grid">
		<div>
			<h1>{t('地元の議会で話し合われていることを、AIがわかりやすく要約します', 'What your local assembly is discussing, summarized in plain language by AI.')}</h1>
			<p class="mission">
				{t('Polic は、地元の議会への関心を広げるための、非営利プロジェクトです。', 'Polic is a non-profit project to get more people interested in their local assembly.')}
				<span class="mission-links">
					{#if JOIN_FORM_URL}
						<a class="text-link" href={JOIN_FORM_URL} target="_blank" rel="noopener external">{t('参加する', 'Get involved')}<Icon name="right" /></a>
					{/if}
				</span>
			</p>
			<div class="find">
				<RegionSearch assemblies={data.assemblies} />
				<p class="live">
					{t('対応中:', 'Now covering:')}
					{#each data.assemblies as a (a.id)}
						<a href={href(`/${a.id}`)}>{t(a.name, a.nameEn)}</a>
					{/each}
				</p>
			</div>
		</div>
		<div class="visual">
			<KantoMap assemblies={data.assemblies} />
		</div>
	</div>
</section>

<section class="band band-alt">
	<div class="container">
		<div class="section-head"><h2>{t('Policでできること', 'What you can do with Polic')}</h2></div>
		<div class="inside-grid">
			<a class="inside" href={href('/tokyo')}>
				<div class="mini" aria-hidden="true">
					<div class="mini-card"><i class="tag"></i><i class="l1"></i><i class="l2"></i></div>
					<div class="mini-card"><i class="tag p"></i><i class="l1"></i><i class="l2"></i></div>
					<div class="mini-card"><i class="tag"></i><i class="l1"></i><i class="l2"></i></div>
				</div>
				<h3>{t('政策と提案', 'Policies and proposals')}<Icon name="right" /></h3>
				<p>{t('提案から決定まで。', 'From proposal to decision.')}</p>
			</a>
			<a class="inside" href={href('/tokyo/meetings')}>
				<div class="mini mini-tl" aria-hidden="true">
					<div class="mini-bar">
						<span style:flex="1"></span><span class="on" style:flex="3"></span><span style:flex="1.4"></span><span style:flex="2.2"></span><span style:flex=".6"></span>
					</div>
					<div class="mini-lines"><i style:width="80%"></i><i style:width="55%"></i></div>
				</div>
				<h3>{t('会議の記録', 'Meeting records')}<span class="soon-tag">{t('準備中', 'Coming soon')}</span></h3>
				<p>{t('長い会議を、話題ごとに。', 'Long meetings, topic by topic.')}</p>
			</a>
			<a class="inside" href={href('/learn')}>
				<div class="mini mini-step" aria-hidden="true">
					<b></b><em></em><b></b><em></em><b></b><em class="off"></em><b class="off"></b><em class="off"></em><b class="off"></b>
				</div>
				<h3>{t('学ぶ', 'Learn')}<Icon name="right" /></h3>
				<p>{t('地方自治と議会のしくみを短く。', 'How local government works, in brief.')}</p>
			</a>
		</div>
	</div>
</section>

{#if data.latest.length}
	<section class="band">
		<div class="container">
			<div class="section-head">
				<h2>{t('新しい政策と提案', 'New policies and proposals')}</h2>
			</div>
			<div class="bill-grid">
				{#each data.latest as b, i (b.id)}
					<BillCard bill={b} assembly={byId(b.assembly)} index={i} />
				{/each}
			</div>
		</div>
	</section>
{/if}

<section class="band band-alt">
	<div class="container">
		<div class="section-head">
			<h2>{t('どうやって作っているか', 'How we make it')}</h2>
			<a class="text-link" href={href('/about')}>{t('くわしく', 'Learn more')}<Icon name="right" /></a>
		</div>
		<ul class="trust-list">
			<li><span class="ic"><Icon name="doc" /></span><b>{t('公式の資料だけ', 'Official sources only')}</b></li>
			<li><span class="ic"><Icon name="sparkle" /></span><b>{t('AIの要約を、チェックして公開', 'AI summaries, checked before publishing')}</b></li>
			<li><span class="ic"><Icon name="scale" /></span><b>{t('どの政党にも寄らない', 'No party favored')}</b></li>
		</ul>
	</div>
</section>

<style>
	.hero {
		padding: 44px 0 40px;
	}

	.hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
		gap: 40px;
		align-items: center;
	}

	h1 {
		font-size: clamp(22px, 3vw, 30px);
		line-height: 1.45;
		letter-spacing: 0;
		word-break: keep-all;
		word-break: auto-phrase;
	}

	.mission {
		margin-top: 16px;
		font-size: 15px;
		color: var(--color-text-muted);
	}

	.mission-links {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		margin-left: 8px;
	}

	.find {
		margin-top: 28px;
	}

	.live {
		margin-top: 14px;
		display: flex;
		flex-wrap: wrap;
		gap: 4px 14px;
		font-size: 13.5px;
		color: var(--color-text-muted);
	}

	.live a {
		font-weight: 700;
	}

	.band {
		padding: 56px 0;
	}

	.band + .band {
		border-top: 1px solid var(--color-ink);
	}

	.band-alt {
		background: var(--color-surface);
		border-top: 1px solid var(--color-ink);
		border-bottom: 1px solid var(--color-ink);
	}

	.section-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 20px;
		flex-wrap: wrap;
		border-bottom: 2px solid var(--color-ink);
		padding-bottom: 10px;
	}

	.section-head h2 {
		font-size: 22px;
	}

	.inside-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
	}

	.inside {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 20px;
		background: var(--color-surface);
		border: 1.5px solid var(--color-ink);
		color: var(--color-text);
		transition:
			transform 0.15s var(--ease),
			box-shadow 0.15s var(--ease);
	}

	.inside:hover {
		text-decoration: none;
		transform: translate(-2px, -2px);
		box-shadow: 5px 5px 0 var(--color-ink);
	}

	.inside h3 {
		font-size: 17px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.inside h3 :global(svg) {
		width: 16px;
		height: 16px;
		color: var(--color-primary);
		transition: transform 0.15s;
	}

	.inside:hover h3 :global(svg) {
		transform: translateX(3px);
	}

	.inside p {
		color: var(--color-text-muted);
		font-size: 14px;
	}

	.mini {
		height: 88px;
		background: var(--color-surface);
		border: 1px solid var(--color-border-strong);
		padding: 12px;
		display: flex;
		gap: 8px;
		overflow: hidden;
	}

	.mini-card {
		flex: 1;
		border: 1px solid var(--color-border-strong);
		padding: 7px;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.mini i {
		display: block;
		height: 6px;
		border-radius: 3px;
		background: var(--color-border);
	}

	.mini-card i.tag {
		width: 40%;
		background: var(--color-status-active);
		opacity: 0.35;
	}

	.mini-card i.tag.p {
		background: var(--color-status-passed);
	}

	.mini-card i.l1 {
		width: 90%;
		background: var(--color-border-strong);
	}

	.mini-card i.l2 {
		width: 60%;
	}

	.mini-tl {
		flex-direction: column;
		justify-content: center;
		gap: 10px;
	}

	.mini-bar {
		display: flex;
		gap: 3px;
		height: 14px;
	}

	.mini-bar span {
		border-radius: 3px;
		background: var(--color-border-strong);
	}

	.mini-bar span.on {
		background: var(--color-primary);
	}

	.mini-lines i {
		margin-top: 6px;
	}

	.mini-step {
		align-items: center;
		justify-content: center;
		gap: 0;
		padding: 12px 18px;
	}

	.mini-step b {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-primary);
		flex-shrink: 0;
	}

	.mini-step em {
		flex: 1;
		height: 2px;
		background: var(--color-primary);
	}

	.mini-step .off {
		background: var(--color-border-strong);
	}

	.bill-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
		gap: 26px 18px;
		justify-items: center;
	}

	.trust-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 24px 28px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.trust-list li {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.ic {
		width: 36px;
		height: 36px;
		border: 1.5px solid var(--color-ink);
		display: grid;
		place-items: center;
		margin-bottom: 4px;
	}

	.ic :global(svg) {
		width: 18px;
		height: 18px;
	}

	.trust-list b {
		font-size: 15.5px;
	}

	@media (max-width: 900px) {
		.hero-grid {
			grid-template-columns: minmax(0, 1fr);
		}

		.visual {
			max-width: 460px;
			margin: 0 auto;
			width: 100%;
		}
	}

	@media (max-width: 760px) {
		.hero {
			padding: 36px 0 32px;
		}

		.band {
			padding: 40px 0;
		}

		.inside-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	@media (max-width: 480px) {
		.bill-grid {
			grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
			gap: 26px 14px;
		}
	}
</style>
