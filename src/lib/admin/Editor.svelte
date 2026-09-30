<script>
	// One bill on the review page. Mounted fresh for each bill and after each AI rewrite, so the form
	// starts from what is saved in data/; plain saves keep it mounted (scroll and search stay put).
	import { tick, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { categories } from '$lib/config/categories.js';
	import BillDetail from '$lib/components/BillDetail.svelte';
	import ListField from './ListField.svelte';
	import Notes from './Notes.svelte';
	import { missingNumbers, sourceNumbers } from './numbers.js';

	/** @type {{ data: any, form: any, next: string | null }} */
	let { data, form, next } = $props();

	const bill = $derived(data.bill);
	const STATE = { held: 'Held: not on the site', auto: 'Live, not checked by you', reviewed: 'Reviewed' };
	const FIELDS = /** @type {const} */ (['name', 'summary', 'changes', 'who', 'why']);

	const pickJa = (/** @type {any} */ b) => ({
		name: b.name ?? '',
		category: b.category ?? categories[0].ja,
		summary: b.summary ?? '',
		changes: [...(b.changes ?? [])],
		who: [...(b.who ?? [])],
		why: b.why ?? ''
	});
	const pickEn = (/** @type {any} */ e) => ({
		name: e?.name ?? '',
		official: e?.official ?? '',
		summary: e?.summary ?? '',
		changes: [...(e?.changes ?? [])],
		who: [...(e?.who ?? [])],
		why: e?.why ?? ''
	});

	let ja = $state(pickJa(untrack(() => data.bill)));
	let en = $state(pickEn(untrack(() => data.bill.en)));
	let saved = $state(JSON.stringify([ja, en]));
	const dirty = $derived(JSON.stringify([ja, en]) !== saved);

	const tab = $derived(page.url.searchParams.get('tab') ?? 'ja');
	const setTab = (/** @type {string} */ t) => goto(`?tab=${t}`, { replaceState: true, noScroll: true, keepFocus: true });

	beforeNavigate((nav) => {
		if (dirty && nav.to?.url.pathname !== page.url.pathname && !confirm('Discard unsaved changes?')) nav.cancel();
	});

	// Source pane search; clicking a quoted flag searches for it too.
	let query = $state('');
	/** @type {HTMLElement | undefined} */
	let sourceEl = $state();
	const escape = (/** @type {string} */ s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const parts = $derived(query.trim() ? data.source.split(new RegExp(`(${escape(query.trim())})`)) : [data.source]);
	const hits = $derived((parts.length - 1) / 2);
	$effect(() => {
		if (!query.trim()) return;
		tick().then(() => sourceEl?.querySelector('mark')?.scrollIntoView({ block: 'center' }));
	});

	const numbers = sourceNumbers(untrack(() => data.source));
	const missing = (/** @type {string | string[]} */ v) => (data.source ? missingNumbers([v].flat().join('\n'), numbers) : []);
	const issuesFor = (/** @type {string} */ field) => (bill.checks?.issues ?? []).filter((/** @type {any} */ i) => i.field === field);
	// Hold reasons that aren't tied to a field (AI notes show under their field instead).
	const general = $derived(data.status.reasons.filter((/** @type {string} */ r) => !r.startsWith('ai ')));
	const quoted = (/** @type {string} */ r) => r.match(/「(.+?)」/)?.[1];

	const preview = $derived({ ...data.preview, ...ja, reviewed: !!bill.approved });

	let busy = $state('');
	/** @type {HTMLFormElement} */
	let formEl;

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	const submit = ({ formData, action, cancel }) => {
		const name = action.search.replace('?/', '');
		const unsaved = dirty ? ' Your unsaved edits will be lost.' : '';
		if (name === 'redraft' && !confirm(`Re-draft this bill with AI and check it again?\n\nAbout $${data.estimate.redraft.toFixed(3)}, and it takes about a minute. The current draft is replaced.${unsaved}`)) return cancel();
		if (name === 'retranslate' && !confirm(`Retranslate the English with AI?\n\nAbout $${data.estimate.translate.toFixed(3)}.${unsaved}`)) return cancel();
		formData.set('json', JSON.stringify(name.endsWith('En') ? en : ja));
		busy = name;
		const target = next;
		return async ({ result, update }) => {
			busy = '';
			if (result.type === 'success' && /^(save|approve)/.test(name)) saved = JSON.stringify([ja, en]);
			await update({ reset: false });
			if (result.type === 'success' && ['approve', 'approveEn', 'factsOk'].includes(name) && target) goto(`/admin/${target}${tab === 'en' ? '?tab=en' : ''}`);
		};
	};

	function onkeydown(/** @type {KeyboardEvent} */ e) {
		if ((e.metaKey || e.ctrlKey) && e.key === 's') {
			e.preventDefault();
			formEl.requestSubmit(formEl.querySelector(tab === 'en' ? '[formaction="?/saveEn"]' : '[formaction="?/save"]'));
		}
	}
</script>

<svelte:window {onkeydown} />

<form class="editor" method="POST" bind:this={formEl} use:enhance={submit}>
	<header class="top">
		<p class="ids">
			<code>{bill.id}</code>
			<span>{data.assembly.name}</span>
			<span>{bill.number}</span>
			<span>{bill.by === 'member' ? '議員提出' : `${data.assembly.head}提出`}</span>
			<span class="state {data.status.state}">{STATE[/** @type {keyof STATE} */ (data.status.state)]}</span>
		</p>
		<h1>{bill.titleOnly ? bill.official : ja.name || bill.official}</h1>
		{#if !bill.titleOnly}<p class="official">{bill.official}</p>{/if}
		<div class="tabs" role="tablist">
			<button type="button" role="tab" aria-selected={tab === 'ja'} onclick={() => setTab('ja')}>Japanese</button>
			<button type="button" role="tab" aria-selected={tab === 'en'} onclick={() => setTab('en')}>
				English{data.enStale ? ' (out of date)' : bill.en && !bill.en.approved ? ' (unchecked)' : ''}
			</button>
			{#if !bill.titleOnly}
				<button type="button" role="tab" aria-selected={tab === 'preview'} onclick={() => setTab('preview')}>Preview</button>
			{/if}
		</div>
	</header>

	{#if tab === 'ja'}
		<div class="split">
			<section class="pane source" aria-label="Source text">
				<div class="pane-head">
					<h2>Source <small>{data.source.length.toLocaleString()} chars</small></h2>
					<input type="search" placeholder="Find in source" bind:value={query} />
					{#if query.trim()}<small class="hits">{hits} found</small>{/if}
				</div>
				<p class="links">
					{#each bill.sources as s (s.url)}<a href={s.url} target="_blank" rel="noreferrer">{s.label} ↗</a>{/each}
				</p>
				{#if data.source}
					<pre bind:this={sourceEl}>{#each parts as p, i (i)}{#if i % 2}<mark>{p}</mark>{:else}{p}{/if}{/each}</pre>
				{:else}
					<p class="empty">No source text saved{bill.titleOnly ? ': this bill is title-only.' : '. Run npm run collect.'}</p>
				{/if}
			</section>

			<section class="pane draft" aria-label="Draft">
				{#if bill.titleOnly}
					<p class="empty">Title-only bill: no summary to check. It goes live with its official title.</p>
				{:else}
					{#if general.length}
						<div class="box">
							<h3>Why it's held</h3>
							<ul>
								{#each general as r (r)}
									{@const q = quoted(r)}
									<li>
										{r}
										{#if q && data.source}<button type="button" class="link" onclick={() => (query = q)}>find in source</button>{/if}
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if bill.factsUpdated}
						<div class="box">
							<h3>Facts changed on {bill.factsUpdated}</h3>
							<p>Check the summary still reads right with the new status, then press “Facts OK”.</p>
						</div>
					{/if}

					<label class="field">
						<span class="label">Headline <small>見出し · {[...ja.name].length}/30</small></span>
						<input bind:value={ja.name} class:over={[...ja.name].length > 30} />
					</label>
					<Notes issues={issuesFor('name')} missing={missing(ja.name)} />

					<label class="field">
						<span class="label">Category <small>カテゴリ</small></span>
						<select bind:value={ja.category}>
							{#each categories as c (c.ja)}<option value={c.ja}>{c.emoji} {c.ja}</option>{/each}
						</select>
					</label>

					<label class="field">
						<span class="label">Summary <small>要約</small></span>
						<textarea rows="4" bind:value={ja.summary}></textarea>
					</label>
					<Notes issues={issuesFor('summary')} missing={missing(ja.summary)} />

					<div class="field">
						<span class="label">What changes <small>何が変わる</small></span>
						<ListField bind:items={ja.changes} add="Add change" />
					</div>
					<Notes issues={issuesFor('changes')} missing={missing(ja.changes)} />

					<div class="field">
						<span class="label">Who is affected <small>対象 · empty moves the bill to the bottom of the board</small></span>
						<ListField bind:items={ja.who} add="Add group" />
					</div>
					<Notes issues={issuesFor('who')} missing={missing(ja.who)} />

					<label class="field">
						<span class="label">Why <small>理由 · must end 「…と、区は説明しています。」</small></span>
						<textarea rows="3" bind:value={ja.why}></textarea>
					</label>
					<Notes issues={issuesFor('why')} missing={missing(ja.why)} />

					<details class="facts">
						<summary>Facts from the source (edit the adapter, not here)</summary>
						<dl>
							<dt>Session</dt><dd>{bill.session}</dd>
							<dt>Committee</dt><dd>{bill.committee ?? '—'}</dd>
							<dt>Status</dt><dd>{bill.status} (stage {bill.stage})</dd>
							<dt>Date</dt><dd>{bill.date ?? '—'} {bill.dateKind}</dd>
						</dl>
					</details>

					<details class="facts">
						<summary>Checklist</summary>
						<ul class="check">
							<li>Every number, date and amount is in the source (kanji numerals, 令和 → 西暦).</li>
							<li>Before and after are the right way round; check the PDF when the table looks broken.</li>
							<li>Nothing the source doesn't say: no background, predictions or “this means…”.</li>
							<li>Own words, neutral, no personal names, plain short sentences, 西暦 dates.</li>
							<li>The reason is attributed to the proposer.</li>
							<li>Headline says what changes (~25 chars) and differs from similar bills.</li>
						</ul>
					</details>
				{/if}
			</section>
		</div>
	{:else if tab === 'en'}
		<div class="split">
			<section class="pane ja" aria-label="Japanese">
				<div class="pane-head"><h2>Japanese <small>translated from this, not the source</small></h2></div>
				<dl class="read">
					{#if !bill.titleOnly}<dt>Headline</dt><dd>{bill.name}</dd>{/if}
					<dt>Official title</dt><dd>{bill.official}</dd>
					{#if !bill.titleOnly}
						<dt>Summary</dt><dd>{bill.summary}</dd>
						{#each /** @type {const} */ (['changes', 'who']) as k (k)}
							<dt>{k === 'changes' ? 'What changes' : 'Who is affected'}</dt>
							<dd><ol>{#each bill[k] ?? [] as x, i (i)}<li>{x}</li>{/each}</ol></dd>
						{/each}
						<dt>Why</dt><dd>{bill.why}</dd>
					{/if}
				</dl>
			</section>
			<section class="pane draft" aria-label="English">
				{#if !bill.en}
					<p class="empty">No English yet.{data.status.state === 'held' ? ' Approve the Japanese first; held bills aren’t translated.' : ''}</p>
				{:else}
					{#if data.enStale}
						<div class="box"><h3>Out of date</h3><p>The Japanese changed after this was translated. Retranslate before approving.</p></div>
					{/if}
					{#if !bill.titleOnly}
						<label class="field"><span class="label">Headline</span><input bind:value={en.name} /></label>
					{/if}
					<label class="field"><span class="label">Official title <small>literal, shown as “unofficial translation”</small></span><input bind:value={en.official} /></label>
					{#if !bill.titleOnly}
						<label class="field"><span class="label">Summary</span><textarea rows="4" bind:value={en.summary}></textarea></label>
						<div class="field"><span class="label">What changes <small>same count as the Japanese ({bill.changes?.length ?? 0})</small></span><ListField bind:items={en.changes} add="Add change" /></div>
						<div class="field"><span class="label">Who is affected <small>same count ({bill.who?.length ?? 0})</small></span><ListField bind:items={en.who} add="Add group" /></div>
						<label class="field"><span class="label">Why <small>keep the attribution (“The ward says…”)</small></span><textarea rows="3" bind:value={en.why}></textarea></label>
					{/if}
				{/if}
			</section>
		</div>
	{:else}
		<div class="preview-wrap">
			<p class="hint">How the popup will look with your current edits{dirty ? ' (not saved yet)' : ''}.</p>
			<div class="preview">
				<BillDetail bill={preview} assembly={data.assembly} today={page.data.today} contact={page.data.contact} scrollTop={0} onclose={() => {}} />
			</div>
		</div>
	{/if}

	<footer class="actions">
		<p class="msg" role="status">
			{#if busy === 'redraft'}Re-drafting and checking… about a minute.
			{:else if busy === 'retranslate'}Translating…
			{:else if form?.message}{form.message}
			{:else if dirty}Unsaved changes · ⌘S to save
			{/if}
		</p>
		{#if tab === 'en'}
			{#if data.status.state !== 'held'}
				<button formaction="?/retranslate" class="ghost" disabled={!!busy}>Retranslate…</button>
			{/if}
			{#if bill.en}
				<button formaction="?/saveEn" disabled={!!busy || !dirty}>Save</button>
				<button formaction="?/approveEn" class="primary" disabled={!!busy || data.enStale}>Approve English{next ? ' & next' : ''}</button>
			{/if}
		{:else if !bill.titleOnly}
			<button formaction="?/redraft" class="ghost" disabled={!!busy}>Re-draft with AI…</button>
			{#if bill.factsUpdated}
				<button formaction="?/factsOk" disabled={!!busy || dirty}>Facts OK</button>
			{/if}
			<button formaction="?/save" disabled={!!busy || !dirty}>Save</button>
			<button formaction="?/approve" class="primary" disabled={!!busy}>{bill.approved ? 'Save as reviewed' : 'Approve'}{next ? ' & next' : ''}</button>
		{/if}
	</footer>
</form>

<style>
	.editor {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.top {
		padding: 14px 24px 0;
		border-bottom: 1.5px solid var(--color-ink);
		background: var(--color-surface);
	}

	.ids {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 12px;
		font-size: 12.5px;
		color: var(--color-text-muted);
	}

	.ids code {
		font-family: var(--font-mono);
		color: var(--color-text);
	}

	.state {
		padding: 1px 8px;
		font-weight: 800;
		border: 1px solid currentColor;
	}

	.state.held {
		color: var(--color-status-rejected);
	}

	.state.auto {
		color: var(--color-status-active);
	}

	.state.reviewed {
		color: var(--color-status-passed);
	}

	h1 {
		margin-top: 4px;
		font-size: 21px;
	}

	.official {
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.tabs {
		display: flex;
		gap: 4px;
		margin-top: 10px;
	}

	.tabs button {
		padding: 7px 14px;
		border: 0;
		border-bottom: 3px solid transparent;
		background: transparent;
		font-weight: 700;
		font-size: 14px;
		color: var(--color-text-muted);
	}

	.tabs button[aria-selected='true'] {
		color: var(--color-text);
		border-bottom-color: var(--color-primary);
	}

	.split {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
	}

	.pane {
		min-height: 0;
		overflow-y: auto;
		padding: 16px 24px 32px;
	}

	.pane + .pane {
		border-left: 1px solid var(--color-border-strong);
	}

	.pane-head {
		position: sticky;
		top: -16px;
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 12px;
		margin: -16px -24px 0;
		padding: 12px 24px;
		background: var(--color-background);
		border-bottom: 1px solid var(--color-border);
	}

	h2 {
		font-size: 15px;
	}

	h2 small,
	.hits {
		font-family: var(--font-body);
		font-weight: 400;
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.pane-head input {
		flex: 1;
		min-width: 140px;
		height: 30px;
		padding: 0 10px;
		border: 1px solid var(--color-border-strong);
		background: var(--color-surface);
		font-size: 13px;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 14px;
		margin: 10px 0;
		font-size: 12.5px;
	}

	pre {
		margin: 0;
		white-space: pre-wrap;
		font-family: var(--font-body);
		font-size: 13.5px;
		line-height: 1.8;
	}

	.empty,
	.hint {
		margin: 16px 0;
		color: var(--color-text-muted);
	}

	.box {
		margin-bottom: 16px;
		padding: 10px 14px;
		border: 1.5px solid var(--color-status-rejected);
		background: var(--color-surface);
		font-size: 13.5px;
	}

	.box h3 {
		font-family: var(--font-body);
		font-size: 13px;
		margin-bottom: 4px;
	}

	.box ul {
		margin: 0;
		padding-left: 18px;
	}

	.link {
		margin-left: 6px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-primary);
		font-size: 12.5px;
		text-decoration: underline;
	}

	.field {
		display: grid;
		gap: 4px;
		margin-top: 16px;
	}

	.label {
		font-size: 13px;
		font-weight: 700;
	}

	.label small {
		font-weight: 400;
		color: var(--color-text-muted);
		margin-left: 4px;
	}

	.field :is(input, select, textarea),
	.field :global(textarea) {
		width: 100%;
		padding: 7px 10px;
		border: 1px solid var(--color-border-strong);
		background: var(--color-surface);
		font-size: 14.5px;
		line-height: 1.7;
		field-sizing: content;
		resize: vertical;
	}

	.field :is(input, select) {
		height: 38px;
	}

	.field :is(input, select, textarea):focus,
	.field :global(textarea:focus) {
		outline: none;
		border-color: var(--color-ink);
		box-shadow: 2px 2px 0 var(--color-ink);
	}

	input.over {
		border-color: var(--color-status-rejected);
	}

	.facts {
		margin-top: 20px;
		font-size: 13.5px;
	}

	.facts summary {
		font-weight: 700;
		cursor: pointer;
		color: var(--color-text-muted);
	}

	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 4px 14px;
		margin: 8px 0 0;
	}

	dt {
		font-weight: 700;
	}

	dd {
		margin: 0;
	}

	.read {
		grid-template-columns: 1fr;
		gap: 2px;
		margin-top: 12px;
	}

	.read dt {
		margin-top: 12px;
		font-size: 12.5px;
		color: var(--color-text-muted);
	}

	.read ol {
		margin: 0;
		padding-left: 20px;
	}

	.check {
		margin: 8px 0 0;
		padding-left: 18px;
	}

	.preview-wrap {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 0 24px 32px;
	}

	.preview {
		max-width: 640px;
		background: var(--color-surface);
		border: 1.5px solid var(--color-ink);
	}

	.preview :global(.bd-head .icon-btn) {
		display: none;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 24px;
		border-top: 1.5px solid var(--color-ink);
		background: var(--color-surface);
	}

	.msg {
		flex: 1;
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.actions button {
		height: 38px;
		padding: 0 16px;
		border: 1.5px solid var(--color-ink);
		background: var(--color-surface);
		font-weight: 700;
		font-size: 14px;
		white-space: nowrap;
	}

	.actions button:hover:not(:disabled) {
		box-shadow: 2px 2px 0 var(--color-ink);
	}

	.actions button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.actions .primary {
		background: var(--color-primary);
		color: var(--color-on-primary);
	}

	.actions .ghost {
		border-color: var(--color-border-strong);
		background: transparent;
		margin-right: auto;
		order: -1;
	}

	@media (max-width: 900px) {
		.editor {
			height: auto;
		}

		.split {
			grid-template-columns: 1fr;
		}

		.pane {
			overflow: visible;
		}

		.pane + .pane {
			border-left: 0;
			border-top: 1px solid var(--color-border-strong);
		}

		.actions {
			position: sticky;
			bottom: 0;
			flex-wrap: wrap;
		}
	}
</style>
