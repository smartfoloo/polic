<script>
	import { page } from '$app/state';
	import { goto, preloadData, pushState } from '$app/navigation';
	import { t, href, categoryLabel, gapNote } from '$lib/i18n.js';
	import { categories } from '$lib/config/categories.js';
	import { billName, billPath, boardOrder, sessionState } from '$lib/bills.js';
	import { ui } from '$lib/ui.svelte.js';
	import BillCard from './BillCard.svelte';
	import BillModal from './BillModal.svelte';
	import Icon from './Icon.svelte';

	/**
	 * @type {{
	 *   assembly: import('$lib/bills.js').PublicAssembly,
	 *   cards: import('$lib/bills.js').BillCard[],
	 *   held: number,
	 *   popular: string[],
	 *   today: string,
	 *   contact: string,
	 *   bill?: import('$lib/bills.js').PublicBill | null
	 * }}
	 */
	let { assembly, cards, held, popular, today, contact, bill = null } = $props();

	let filter = $state('');
	const ordered = $derived(boardOrder(cards, assembly));
	const topics = $derived(categories.map((c) => c.ja).filter((c) => cards.some((b) => b.category === c)));
	const shown = $derived(filter ? ordered.filter((b) => b.category === filter) : ordered);
	const popularCards = $derived(popular.map((id) => cards.find((b) => b.id === id)).filter((b) => !!b));

	// The popup: a bill opened from this board, or the one this page was loaded for.
	const current = $derived(page.state.bill ?? (page.state.closed ? null : bill));

	/** Open a bill over the board without leaving it; the URL still changes so it can be shared. */
	async function open(/** @type {MouseEvent} */ e, /** @type {import('$lib/bills.js').BillCard} */ card) {
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
		e.preventDefault();
		const url = href(billPath(card));
		const result = await preloadData(url);
		if (result.type === 'loaded' && result.status === 200) pushState(url, { bill: result.data.bill });
		else goto(url);
	}

	function close() {
		if (page.state.bill) history.back();
		else pushState(href(`/${assembly.id}`), { closed: true });
	}
</script>

<svelte:head>
	<title>{current ? billName(current) : t(`${assembly.place}の政策と提案`, `Policies and proposals in ${assembly.placeEn}`)} — Polic</title>
</svelte:head>

<div class="container hub-head">
	<div class="title-row">
		<h1>{t(`${assembly.place}の政策と提案`, `Policies and proposals in ${assembly.placeEn}`)}</h1>
		<button
			type="button"
			class="region-pill"
			aria-haspopup="dialog"
			aria-label={t(`地域：${assembly.place}（変更する）`, `Region: ${assembly.placeEn} (change)`)}
			onclick={() => (ui.pickerOpen = true)}
		>
			<Icon name="pin" class="pin" /><span>{t(assembly.place, assembly.placeEn)}</span><Icon name="down" />
		</button>
	</div>
	<div class="coverage">
		<ul class="sessions">
			{#each assembly.sessions as s (s.name)}
				<li class:open={sessionState(s, today) === 'open'}>
					{t(s.name, s.nameEn)}{#if sessionState(s, today) === 'open'}<span class="open-tag">{t('開会中', 'In session')}</span>{/if}
				</li>
			{/each}
		</ul>
		<p>
			{t(
				'掲載しているのは、これらの定例会に出された条例の議案だけです。予算・契約・人事・報告などは対象外です。',
				'We only list ordinance bills submitted in these sessions. Budgets, contracts, appointments and reports are not covered.'
			)}
		</p>
		{#each assembly.gaps as g (g)}
			<p class="gap"><Icon name="info" />{gapNote(g)}</p>
		{/each}
	</div>
</div>

<div class="container hub-body">
	{#if popularCards.length}
		<section class="popular" aria-labelledby="popular-title">
			<h2 id="popular-title">{t('よく見られている', 'Most viewed')}</h2>
			<ul>
				{#each popularCards as b (b.id)}
					<li><a href={href(billPath(b))} onclick={(e) => open(e, b)}>{billName(b)}</a></li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if topics.length > 1}
		<div class="chips" role="group" aria-label={t('分野で絞り込む', 'Filter by topic')}>
			<button type="button" class="chip" aria-pressed={!filter} onclick={() => (filter = '')}>{t('すべて', 'All')}</button>
			{#each topics as c (c)}
				<button type="button" class="chip" aria-pressed={filter === c} onclick={() => (filter = c)}>{categoryLabel(c)}</button>
			{/each}
		</div>
	{/if}

	{#if shown.length}
		<div class="bill-grid">
			{#each shown as b, i (b.id)}
				<BillCard bill={b} {assembly} index={i} onopen={(e) => open(e, b)} />
			{/each}
		</div>
	{:else}
		<p class="empty">{t('まだ掲載している議案はありません。', 'No bills listed yet.')}</p>
	{/if}

	{#if held}
		<p class="held">
			{t(`ほかに確認中の議案が${held}件あります。`, `${held} more ${held === 1 ? 'bill is' : 'bills are'} being checked before listing.`)}
		</p>
	{/if}
</div>

{#if current}
	{#key current.id}
		<BillModal bill={current} {assembly} {today} {contact} onclose={close} />
	{/key}
{/if}

<style>
	.hub-head {
		padding-top: 28px;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 14px 18px;
		flex-wrap: wrap;
		margin-top: 6px;
		border-bottom: 1px solid var(--color-ink);
		padding-bottom: 12px;
	}

	.title-row h1 {
		font-size: clamp(26px, 3.4vw, 34px);
		word-break: keep-all;
		word-break: auto-phrase;
	}

	.title-row .region-pill {
		margin-left: auto;
	}

	.coverage {
		margin-top: 14px;
		font-size: 13.5px;
		color: var(--color-text-muted);
	}

	.gap {
		display: flex;
		gap: 6px;
		align-items: flex-start;
		margin-top: 6px;
	}

	.gap :global(svg) {
		width: 15px;
		height: 15px;
		flex-shrink: 0;
		margin-top: 3px;
	}

	.sessions {
		list-style: none;
		margin: 0 0 6px;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.sessions li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 2px 10px;
		border: 1px solid var(--color-border-strong);
		background: var(--color-surface);
		font-weight: 700;
		color: var(--color-text);
	}

	.sessions li.open {
		border-color: var(--color-primary);
	}

	.open-tag {
		font-size: 11.5px;
		padding: 0 6px;
		background: var(--color-primary);
		color: var(--color-on-primary);
	}

	.hub-body {
		padding-top: 20px;
		padding-bottom: 64px;
	}

	.popular {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 14px;
		margin-bottom: 18px;
		font-size: 14px;
	}

	.popular h2 {
		font-family: var(--font-body);
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.popular ul {
		display: contents;
		list-style: none;
	}

	.popular a {
		font-weight: 700;
	}

	.chips {
		margin-bottom: 16px;
	}

	.bill-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
		gap: 26px 18px;
		justify-items: center;
	}

	.held {
		margin-top: 32px;
		text-align: center;
		font-size: 12.5px;
		color: var(--color-text-muted);
	}

	@media (max-width: 480px) {
		.bill-grid {
			grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
			gap: 26px 14px;
		}
	}
</style>
