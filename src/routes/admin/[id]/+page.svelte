<script>
	import Editor from '$lib/admin/Editor.svelte';
	import { reviewOrder } from '$lib/admin/order.js';

	let { data, form } = $props();

	// Next in review order after this bill, skipping ones that just left the queues. Optional bills
	// lead to more optional bills; everything else leads through the to-do queues.
	const next = $derived.by(() => {
		const queue = data.queues.find((q) => q.id === data.bills.find((b) => b.id === data.bill.id)?.queues[0]);
		const order = reviewOrder(data.bills, data.queues, queue?.group === 'optional' ? 'optional' : 'todo');
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
