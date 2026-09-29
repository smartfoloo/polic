<script>
	import Board from '$lib/components/Board.svelte';

	let { data } = $props();
</script>

<Board {...data} />
