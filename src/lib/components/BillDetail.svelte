<script>
	import { dev } from '$app/environment';
	import { t, isEn, fmtDate, gapNote, statusLabel, STATUS_CLASS } from '$lib/i18n.js';
	import { billName, dateLine, proposer, stageNote, sessionState, sessionStateLabel } from '$lib/bills.js';
	import Icon from './Icon.svelte';
	import Popover from './Popover.svelte';
	import Stepper from './Stepper.svelte';

	/**
	 * @type {{
	 *   bill: import('$lib/bills.js').PublicBill,
	 *   assembly: import('$lib/bills.js').PublicAssembly,
	 *   today: string,
	 *   contact: string,
	 *   scrollTop: number,
	 *   onclose: () => void
	 * }}
	 */
	let { bill, assembly, today, contact, scrollTop, onclose } = $props();

	let topHeight = $state(0);
	let sourcesOpen = $state(false);
	/** @type {HTMLElement} */
	let sourcesEl;

	// English when there is a current translation; otherwise the Japanese, marked as such.
	const en = $derived(isEn() ? bill.en : null);
	const jaOnly = $derived(isEn() && !bill.titleOnly && !bill.en);
	const text = $derived({
		summary: en?.summary ?? bill.summary,
		changes: en?.changes ?? bill.changes ?? [],
		who: en?.who ?? bill.who ?? [],
		why: en?.why ?? bill.why
	});
	const session = $derived(assembly.sessions.find((s) => s.name === bill.session));

	const mail = $derived(
		`mailto:${contact}?subject=${encodeURIComponent(t(`誤りの報告：${bill.id}`, `Error report: ${bill.id}`))}&body=${encodeURIComponent(
			`${bill.official}（${bill.id}）\n\n`
		)}`
	);

	// One view beacon per bill shown (Caddy answers /v/* with 204 and logs it; see PLAN.md Step 7).
	$effect(() => {
		if (!dev) fetch(`/v/${bill.id}`, { method: 'POST', keepalive: true }).catch(() => {});
	});

	function showSources() {
		sourcesOpen = true;
		sourcesEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<header class="bd-head" class:pinned={scrollTop > topHeight}>
	<h2 class="bd-title" id="bill-title" lang={isEn() && !bill.en ? 'ja' : undefined}>{billName(bill)}</h2>
	<button class="icon-btn" type="button" aria-label={t('閉じる', 'Close')} onclick={onclose}><Icon name="close" /></button>
</header>

<div class="bd-top" bind:offsetHeight={topHeight}>
	{#if en}
		<p class="bd-official">{en.official} <span class="tag">{t('非公式訳', 'unofficial translation')}</span></p>
		<p class="bd-official" lang="ja">{bill.official}（{bill.number}）</p>
	{:else}
		<p class="bd-official" lang="ja">{bill.official}（{bill.number}）</p>
	{/if}
	<p class="bd-meta">
		<span><Icon name="group" />{proposer(bill, assembly)}</span>
		{#if dateLine(bill)}
			<span><Icon name="cal" />{dateLine(bill)}</span>
		{/if}
		{#if session}
			{@const state = sessionState(session, today)}
			<span>
				<Popover ariaLabel={t(`${session.name}の日程`, `${session.nameEn} dates`)}>
					{#snippet label()}{t(session.name, session.nameEn)}<Icon name="info" class="i" />{/snippet}
					<b>{t(session.name, session.nameEn)}</b>
					{fmtDate(session.opened)} 〜 {fmtDate(session.closes)}{state === 'open' ? t('（閉会予定）', ' (scheduled)') : ''}<br />
					{sessionStateLabel(state)}
				</Popover>
			</span>
		{/if}
		<span class="status {STATUS_CLASS[bill.status]}">{statusLabel(bill.status)}</span>
	</p>
	<p class="disclose">
		{#if bill.titleOnly && assembly.gaps.includes('scanned')}
			<Icon name="doc" />
			<span>{gapNote('scanned')}</span>
		{:else if bill.titleOnly}
			<Icon name="doc" />
			<span>{t('議案の本文は公開されていません。題名と結果だけを載せています。', "The bill's text hasn't been published. Only its title and result are shown.")}</span>
		{:else if bill.reviewed}
			<Icon name="check" />
			<span>{t('AIが作成し、人が確認した要約です。', 'Summary written by AI and checked by a person.')}</span>
		{:else}
			<Icon name="sparkle" />
			<span>
				{t('AIが作成した要約です。まだ人が確認していません。正確な内容は', 'Summary written by AI, not yet checked by a person. For the exact content, see the')}
				<button type="button" class="inline-link" onclick={showSources}>{t('原文', 'original documents')}</button>{t('をご確認ください。', '.')}
			</span>
		{/if}
	</p>
	{#if en && !bill.titleOnly}
		<p class="disclose">
			<Icon name="info" />
			<span>
				{en.reviewed
					? 'Translated from our Japanese summary and checked by a person. The Japanese is authoritative.'
					: 'Machine translation of our Japanese summary, not yet checked by a person. The Japanese is authoritative.'}
			</span>
		</p>
	{:else if jaOnly}
		<p class="disclose"><Icon name="info" /><span>English coming soon. The summary below is in Japanese.</span></p>
	{/if}
</div>

<div class="bd-body" lang={jaOnly ? 'ja' : undefined}>
	{#if !bill.titleOnly}
		<p class="bd-sum">{text.summary}</p>
		{#if text.changes.length}
			<section class="bd-sec">
				<h3>{t('何が変わる？', 'What changes?')}</h3>
				<ul class="changes">
					{#each text.changes as c, i (i)}<li>{c}</li>{/each}
				</ul>
			</section>
		{/if}
		{#if text.who.length}
			<section class="bd-sec">
				<h3>{bill.status === '否決' ? t('誰に影響するはずだった？', 'Who would it have affected?') : t('誰に影響がある？', 'Who does it affect?')}</h3>
				<ul class="changes">
					{#each text.who as w, i (i)}<li>{w}</li>{/each}
				</ul>
			</section>
		{/if}
		{#if text.why}
			<section class="bd-sec">
				<h3>{t('なんで今？', 'Why now?')}</h3>
				<p>{text.why}</p>
			</section>
		{/if}
	{/if}

	<section class="bd-sec" lang={jaOnly ? 'en' : undefined}>
		<h3>{t('進み具合', 'Progress')}</h3>
		<Stepper {bill} />
		<p class="stage-note">{stageNote(bill)}</p>
	</section>

	<section class="bd-sec" bind:this={sourcesEl} lang={jaOnly ? 'en' : undefined}>
		<button type="button" class="src-toggle" aria-expanded={sourcesOpen} aria-controls="sources-{bill.id}" onclick={() => (sourcesOpen = !sourcesOpen)}>
			{sourcesOpen ? t('出典を閉じる', 'Hide sources') : t('出典を見る', 'Show sources')}<Icon name="down" />
		</button>
		<div class="src-panel" class:open={sourcesOpen} id="sources-{bill.id}">
			<div>
				<ul>
					{#each bill.sources as s (s.url)}
						<li><a href={s.url} rel="noopener external" target="_blank" lang="ja">{s.label}</a></li>
					{/each}
				</ul>
			</div>
		</div>
	</section>

	<p class="bd-foot" lang={jaOnly ? 'en' : undefined}>
		<a href={mail}>{t('誤りを報告する', 'Report an error')}</a>
	</p>
</div>

<style>
	.bd-head {
		position: sticky;
		top: 0;
		z-index: 2;
		background: var(--color-surface);
		display: flex;
		gap: 12px;
		align-items: flex-start;
		justify-content: space-between;
		padding: 24px 26px 10px;
		border-bottom: 2px solid transparent;
		transition: border-color 0.15s;
	}

	.bd-head.pinned {
		border-bottom-color: var(--color-ink);
	}

	.bd-title {
		font-size: 22px;
		line-height: 1.45;
		word-break: keep-all;
		word-break: auto-phrase;
	}

	.bd-top {
		padding: 0 26px 18px;
		border-bottom: 2px solid var(--color-ink);
	}

	.bd-official {
		font-size: 13px;
		color: var(--color-text-muted);
		line-height: 1.6;
	}

	.tag {
		font-size: 11.5px;
		font-weight: 700;
		background: var(--color-surface-alt);
		padding: 1px 6px;
		white-space: nowrap;
	}

	.bd-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 18px;
		margin-top: 12px;
		color: var(--color-text-muted);
	}

	.bd-meta > span {
		display: inline-flex;
		gap: 6px;
		align-items: center;
	}

	.bd-meta :global(svg) {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.bd-meta :global(.i) {
		width: 14px;
		height: 14px;
	}

	.bd-meta .status {
		height: 28px;
		padding: 0 12px;
		margin-left: 4px;
	}

	.disclose {
		display: flex;
		gap: 8px;
		align-items: flex-start;
		margin-top: 12px;
		font-size: 13.5px;
		line-height: 1.65;
		color: var(--color-text-muted);
	}

	.disclose :global(svg) {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		margin-top: 3px;
	}

	.inline-link {
		background: none;
		border: 0;
		padding: 0;
		font-weight: 700;
		color: var(--color-primary);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.bd-body {
		padding: 20px 26px 28px;
	}

	.bd-sum {
		line-height: 1.85;
	}

	.bd-sec {
		margin-top: 32px;
	}

	.bd-sec h3 {
		font-size: 16px;
		margin-bottom: 10px;
	}

	.changes {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.changes li {
		position: relative;
		padding-left: 18px;
		line-height: 1.65;
	}

	.changes li::before {
		content: '';
		position: absolute;
		left: 3px;
		top: calc(0.825em - 2.5px);
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--color-text);
	}

	.src-toggle {
		background: var(--color-surface);
		border: 1px solid var(--color-ink);
		padding: 6px 14px;
		font-weight: 700;
		color: var(--color-text-muted);
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.src-toggle:hover {
		color: var(--color-primary);
	}

	.src-toggle :global(svg) {
		width: 15px;
		height: 15px;
		transition: transform 0.2s;
	}

	.src-toggle[aria-expanded='true'] :global(svg) {
		transform: rotate(180deg);
	}

	.src-panel {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.3s var(--ease);
	}

	.src-panel.open {
		grid-template-rows: 1fr;
	}

	.src-panel > div {
		overflow: hidden;
	}

	.src-panel ul {
		margin: 12px 0 0;
		padding: 14px 16px 14px 32px;
		background: var(--color-surface-alt);
	}

	.src-panel li + li {
		margin-top: 6px;
	}

	.bd-foot {
		margin-top: 28px;
		padding-top: 16px;
		border-top: 1px solid var(--color-border-strong);
		color: var(--color-text-muted);
	}

	@media (max-width: 760px) {
		.bd-head {
			padding: 18px 18px 10px;
		}

		.bd-title {
			font-size: 20px;
		}

		.bd-top {
			padding: 0 18px 16px;
		}

		.bd-body {
			padding: 18px 18px calc(28px + env(safe-area-inset-bottom));
		}
	}
</style>
