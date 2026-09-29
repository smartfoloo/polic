<script>
	import { onMount } from 'svelte';
	import BillDetail from './BillDetail.svelte';

	/**
	 * @type {{
	 *   bill: import('$lib/bills.js').PublicBill,
	 *   assembly: import('$lib/bills.js').PublicAssembly,
	 *   today: string,
	 *   contact: string,
	 *   onclose: () => void
	 * }}
	 */
	let { bill, assembly, today, contact, onclose } = $props();

	/** @type {HTMLDialogElement} */
	let dialog;
	let scrollTop = $state(0);

	onMount(() => dialog.showModal());
</script>

<dialog
	bind:this={dialog}
	class="sheet bill"
	aria-labelledby="bill-title"
	onscroll={() => (scrollTop = dialog.scrollTop)}
	onclose={onclose}
	onclick={(e) => e.target === dialog && dialog.close()}
>
	<BillDetail {bill} {assembly} {today} {contact} {scrollTop} onclose={() => dialog.close()} />
</dialog>

<style>
	dialog.bill {
		max-width: 640px;
		max-height: 86vh;
		margin-top: 7vh;
	}

	@media (min-width: 1100px) {
		dialog.bill {
			max-width: 800px;
		}
	}

	@media (max-width: 760px) {
		dialog.bill {
			max-width: none;
			max-height: 92vh;
			margin-top: auto;
		}
	}
</style>
