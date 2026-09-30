<script>
	import { t, href, isEn } from '$lib/i18n.js';
	import Popover from './Popover.svelte';

	/** @type {{ bill: import('$lib/bills.js').PublicBill }} */
	let { bill } = $props();

	const rejected = $derived(bill.status === '否決');
	const labels = $derived([
		t('提案', 'Proposed'),
		t('委員会', 'Committee'),
		t('本会議', 'Plenary'),
		rejected ? t('否決', 'Rejected') : t('決定', 'Passed'),
		...(rejected ? [] : [t('実施', 'In effect')])
	]);
	const terms = /** @type {Record<number, { slug: string, ja: [string, string], en: [string, string] }>} */ ({
		1: {
			slug: 'committee',
			ja: ['委員会とは', '委員会は、議員が分野ごとに分かれた少人数のグループです。議案の細かい質問や議論は、ほとんどが委員会で行われます。'],
			en: ['What is a committee?', 'A committee is a small group of members assigned to one area. Most detailed questions and debate on a bill happen in committee.']
		},
		2: {
			slug: 'plenary',
			ja: ['本会議とは', '本会議は、すべての議員が集まる会議です。議案を最終的に決めるのはここです。'],
			en: ['What is a plenary session?', "A plenary session is a meeting of all members. It's where bills are finally decided."]
		}
	});
</script>

<ol class="steps" aria-label={t('進み具合', 'Progress')}>
	{#each labels as name, i (i)}
		<li class="step" class:done={i <= bill.stage} class:rej={rejected && i === 3} style:--k={i} aria-current={i === bill.stage ? 'step' : undefined}>
			<span class="dot" class:current={i === bill.stage}></span>
			{#if terms[i]}
				{@const [title, lead] = terms[i][isEn() ? 'en' : 'ja']}
				<Popover class="lab">
					{#snippet label()}{name}<span class="q" aria-hidden="true">?</span>{/snippet}
					<b>{title}</b>{lead}
					<a class="more" href={href(`/learn/${terms[i].slug}`)}>{t('くわしく', 'Learn more')}</a>
				</Popover>
			{:else}
				<span class="lab">{name}</span>
			{/if}
		</li>
	{/each}
</ol>

<style>
	.steps {
		display: flex;
		list-style: none;
		margin: 6px 0 14px;
		padding: 0;
	}

	.step {
		flex: 1 1 0;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		position: relative;
		text-align: center;
		color: var(--color-text-muted);
	}

	.dot {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--color-surface);
		border: 2px solid var(--color-border-strong);
		position: relative;
		z-index: 1;
	}

	.step::before,
	.step::after {
		content: '';
		position: absolute;
		top: 6px;
		right: 50%;
		width: 100%;
		height: 2px;
		background: var(--color-border);
	}

	.step::after {
		background: var(--color-primary);
		transform: scaleX(0);
		transform-origin: left;
		animation: grow 0.35s var(--ease) forwards;
		animation-delay: calc(var(--k) * 110ms + 120ms);
		animation-play-state: paused;
	}

	.step.done::after {
		animation-play-state: running;
	}

	@keyframes grow {
		to {
			transform: none;
		}
	}

	.step:first-child::before,
	.step:first-child::after {
		display: none;
	}

	.done .dot {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}

	.dot.current {
		box-shadow: 0 0 0 5px var(--color-primary-soft);
	}

	.done :global(.lab) {
		color: var(--color-text);
		font-weight: 700;
	}

	.rej .dot {
		background: var(--color-status-rejected);
		border-color: var(--color-status-rejected);
	}

	.rej :global(.lab) {
		color: var(--color-status-rejected);
	}

	.step :global(.lab) {
		line-height: 1.35;
		word-break: keep-all;
	}

	@media (max-width: 560px) {
		.steps {
			flex-direction: column;
			margin: 4px 0 12px;
		}

		.step {
			flex-direction: row;
			gap: 12px;
			text-align: left;
			padding: 7px 0;
		}

		.step::before,
		.step::after {
			top: auto;
			bottom: 50%;
			right: auto;
			left: 6px;
			width: 2px;
			height: 100%;
			transform-origin: top;
		}

		.step::after {
			transform: scaleY(0);
		}

		.dot {
			flex-shrink: 0;
		}
	}

	.more {
		display: block;
		margin-top: 6px;
		font-weight: 700;
	}
</style>
