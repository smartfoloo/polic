<script>
	import { t, href } from '$lib/i18n.js';
	import SoonPanel from '$lib/components/SoonPanel.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();
	const a = $derived(/** @type {import('$lib/bills.js').PublicAssembly} */ (data.assembly));
</script>

<SoonPanel
	title={t('会議の記録', 'Meeting records')}
	text={t('長い会議の録画を、わかりやすくまとめる機能を作っています。', "We're building a way to turn long meeting recordings into clear summaries.")}
>
	<a class="btn btn-primary" href={href(`/${a.id}`)}>
		{t(`${a.place}の政策と提案を見る`, `See policies and proposals in ${a.placeEn}`)}<Icon name="right" />
	</a>
</SoonPanel>
