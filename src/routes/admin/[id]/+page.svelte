<script>
	import Editor from '$lib/admin/Editor.svelte';
	import { reviewOrder } from '$lib/admin/order.js';

	let { data, form } = $props();

	// Next in review order after this bill, skipping ones that just left the queues.
	const next = $derived.by(() => {
		const order = reviewOrder(data.bills, data.queues);
		const i = order.findIndex((b) => b.id === data.bill.id);
		return (i >= 0 ? order[i + 1] : order.find((b) => b.id !== data.bill.id))?.id ?? null;
	});
</script>

<svelte:head>
	<title>{data.bill.id} — Review — Polic</title>
</svelte:head>

<!-- Remount when the bill or its AI text changes, not on every save. -->
{#key `${data.bill.id}|${data.bill.draft?.generatedAt}|${data.bill.en?.draft?.generatedAt}`}
	<Editor {data} {form} {next} />
{/key}
