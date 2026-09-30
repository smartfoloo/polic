<script>
	import { page } from '$app/state';
	import { t, href } from '$lib/i18n.js';
	import { ui } from '$lib/ui.svelte.js';
	import Icon from './Icon.svelte';

	/** @type {{ assemblies: import('$lib/bills.js').PublicAssembly[] }} */
	let { assemblies } = $props();

	/** @type {HTMLDialogElement} */
	let dialog;
	$effect(() => {
		if (ui.pickerOpen && !dialog.open) dialog.showModal();
		if (!ui.pickerOpen && dialog.open) dialog.close();
	});

	const prefs = $derived(assemblies.filter((a) => a.level === 'pref'));
	const munis = (/** @type {string} */ pref) => assemblies.filter((a) => a.parent === pref);
</script>

{#snippet option(/** @type {import('$lib/bills.js').PublicAssembly} */ a)}
	<li>
		<a
			class="opt"
			class:muni={a.level === 'muni'}
			href={href(`/${a.id}`)}
			aria-current={page.params.assembly === a.id ? 'page' : undefined}
			onclick={() => (ui.pickerOpen = false)}
		>
			{t(a.name, a.nameEn)}
			{#if page.params.assembly === a.id}<span class="here">{t('表示中', 'Current')}</span>{/if}
		</a>
	</li>
{/snippet}

<dialog
	bind:this={dialog}
	class="sheet"
	aria-labelledby="picker-title"
	onclose={() => (ui.pickerOpen = false)}
	onclick={(e) => e.target === dialog && dialog.close()}
>
	<div class="inner">
		<div class="sheet-head">
			<h2 id="picker-title">{t('地域を選ぶ', 'Choose a region')}</h2>
			<button class="icon-btn" type="button" aria-label={t('閉じる', 'Close')} onclick={() => dialog.close()}><Icon name="close" /></button>
		</div>
		<ul class="list">
			{#each prefs as p (p.id)}
				{@render option(p)}
				{#each munis(p.id) as m (m.id)}
					{@render option(m)}
				{/each}
			{/each}
		</ul>
		<p class="note">{t('ほかの関東の地域は準備中です。', 'More of the Kanto region is coming.')}</p>
	</div>
</dialog>

<style>
	.inner {
		padding: 22px 22px 26px;
	}

	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 14px;
	}

	.sheet-head h2 {
		font-size: 19px;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		border-top: 1px solid var(--color-border-strong);
	}

	.list li {
		border-bottom: 1px solid var(--color-border-strong);
	}

	.opt {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px;
		font-weight: 700;
		color: var(--color-text);
	}

	.opt:hover {
		background: var(--color-surface-alt);
		text-decoration: none;
	}

	.opt.muni {
		padding-left: 32px;
		font-weight: 400;
	}

	.here {
		margin-left: auto;
		font-size: 11.5px;
		font-weight: 700;
		color: var(--color-status-passed);
		background: var(--color-status-passed-bg);
		padding: 2px 8px;
	}

	.note {
		margin-top: 14px;
		font-size: 13px;
		color: var(--color-text-muted);
	}

	@media (max-width: 760px) {
		.inner {
			padding: 16px 18px calc(24px + env(safe-area-inset-bottom));
		}
	}
</style>
