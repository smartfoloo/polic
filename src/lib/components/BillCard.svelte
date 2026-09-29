<script>
	import { href, isEn, statusLabel, categoryEmoji, STATUS_CLASS } from '$lib/i18n.js';
	import { billName, billPath, proposer, sessionShort } from '$lib/bills.js';

	/**
	 * @type {{
	 *   bill: import('$lib/bills.js').BillCard,
	 *   assembly: import('$lib/bills.js').PublicAssembly,
	 *   index: number,
	 *   onopen?: (e: MouseEvent) => void
	 * }}
	 */
	let { bill, assembly, index, onopen } = $props();

	const TILTS = [-2, 1.5, -1, 2, -1.5, 1, -2, 1.5, -1, 2];
	const name = $derived(billName(bill));
</script>

<a class="bill-card" href={href(billPath(bill))} onclick={onopen} style:--i={Math.min(index, 12)} style:--tilt="{TILTS[index % TILTS.length]}deg">
	<span class="paper">
		<span class="badges">
			<span class="by-tag">{proposer(bill, assembly)}</span>
			<span class="status {STATUS_CLASS[bill.status]}">{statusLabel(bill.status)}</span>
		</span>
		<span class="emoji" aria-hidden="true">{bill.titleOnly ? '📄' : categoryEmoji(bill.category ?? '')}</span>
		<span class="session">{sessionShort(bill.session, assembly)}</span>
	</span>
	<span class="caption" lang={isEn() && !bill.en ? 'ja' : undefined}>{#each name.split('、') as part, i (i)}{#if i}、<wbr />{/if}{part}{/each}</span>
</a>

<style>
	.bill-card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		max-width: 176px;
		padding: 12px;
		color: var(--color-text);
		transform: rotate(var(--tilt, 0deg));
		transition:
			transform 0.1s var(--ease),
			background 0.3s ease;
		animation: pin-drop 0.25s var(--ease) both;
		animation-delay: calc(var(--i, 0) * 35ms);
	}

	@keyframes pin-drop {
		from {
			opacity: 0;
			transform: translateY(16px) rotate(0deg) scale(0.94);
		}
	}

	.bill-card:hover,
	.bill-card:focus-visible {
		text-decoration: none;
		background: var(--color-hover);
	}

	.paper {
		position: relative;
		width: 100%;
		aspect-ratio: 3 / 4;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--color-surface);
		background-image: repeating-linear-gradient(to bottom, transparent 0, transparent 27px, var(--color-paper-rule) 28px);
		border: 1px solid var(--color-ink);
		box-shadow: 3px 3px 0 var(--color-shadow-hard);
	}

	.badges {
		position: absolute;
		top: 10px;
		left: 10px;
		right: 10px;
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		align-items: center;
		gap: 4px;
	}

	.badges .status,
	.by-tag {
		height: 20px;
		padding: 0 8px;
		font-size: 10.5px;
	}

	.badges .status {
		background: var(--color-surface);
	}

	.by-tag {
		display: inline-flex;
		align-items: center;
		font-weight: 700;
		white-space: nowrap;
		color: var(--color-text-muted);
		border: 1px solid var(--color-text-muted);
	}

	.emoji {
		font-size: 64px;
		line-height: 1;
		font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
		user-select: none;
	}

	.session {
		position: absolute;
		bottom: 8px;
		left: 10px;
		right: 10px;
		font-size: 10.5px;
		color: var(--color-text-muted);
		text-align: center;
		line-height: 1.3;
	}

	.caption {
		width: 100%;
		min-width: 0;
		margin-top: 10px;
		font-family: var(--font-heading);
		font-size: 13px;
		font-weight: 700;
		line-height: 1.45;
		text-align: center;
		word-break: keep-all;
		word-break: auto-phrase;
		overflow-wrap: break-word;
	}

	:global(:root[lang='en']) .caption {
		font-size: 14px;
		line-height: 1.3;
	}

	@media (max-width: 480px) {
		.bill-card {
			max-width: 155px;
			padding: 18px 10px 14px;
		}

		.badges {
			left: 7px;
			right: 7px;
			top: 8px;
			gap: 3px;
		}

		.emoji {
			font-size: 48px;
		}

		.badges .status,
		.by-tag {
			height: 18px;
			padding: 0 6px;
			font-size: 9.5px;
		}
	}
</style>
