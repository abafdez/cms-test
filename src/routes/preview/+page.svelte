<!-- The live preview. The CMS shows this page in an iframe (static/admin/preview.js) and
     posts it the unsaved entry on every change; it renders it with the same Post component
     as /posts/[slug]. Works on a static host: no server writes anything.

     EXPERIMENT, editing in place (Editor.svelte): what's typed here goes back to the CMS
     as it's typed (cms-preview-edit), which writes it into its form; the CMS then sends
     the entry back, like any change. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import Post from '#lib/Post.svelte';
	import Editor from './Editor.svelte';

	type Entry = { title: string; date: string; body: string };
	type Field = 'title' | 'body';
	let entry = $state<Entry>();

	// The entry as the CMS last sent it, and what we sent it since that it hasn't sent back
	// yet. A value the CMS sends is an echo of ours (dropped: we're there already, or ahead)
	// or a change made in its form (taken). Without this, a late echo would undo typing.
	const cms: Partial<Record<Field, string>> = {};
	const sent: Record<Field, string[]> = { title: [], body: [] };

	function take(field: Field, value: string) {
		if (cms[field] === value) return; // not changed on the CMS's side
		cms[field] = value;
		const echo = sent[field].indexOf(value);
		if (echo >= 0) sent[field].splice(0, echo + 1);
		else {
			sent[field] = [];
			entry![field] = value;
		}
	}

	function edit(field: Field, value: string) {
		if (!entry || entry[field] === value) return;
		entry[field] = value;
		sent[field].push(value);
		// '*' as for the ready message; the CMS checks that it comes from its own frame.
		parent.postMessage({ type: 'cms-preview-edit', field, value }, '*');
	}

	onMount(() => {
		function receive(event: MessageEvent) {
			// Only the CMS, which is served from this same origin, may draw here.
			if (event.origin !== location.origin || event.data?.type !== 'cms-preview') return;
			const text = (value: unknown) => String(value ?? '');
			entry ??= { title: '', date: '', body: '' };
			entry.date = text(event.data.date);
			take('title', text(event.data.title));
			take('body', text(event.data.body));
		}
		addEventListener('message', receive);
		// Tell the CMS we're listening, so it sends the entry now (it can't know when we've
		// loaded). '*': it carries no data, and Sveltia's preview frame, our parent, may be a
		// blob: or sandboxed document whose origin isn't ours.
		parent.postMessage({ type: 'cms-preview-ready' }, '*');
		return () => removeEventListener('message', receive);
	});
</script>

<svelte:head>
	<title>Preview</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if entry}
	<Post {...entry}>
		<Editor title={entry.title} body={entry.body} onchange={edit} />
	</Post>
{:else}
	<p>Waiting for the CMS… (this page shows the entry being edited in /admin/)</p>
{/if}
