<!-- The live preview. The CMS shows this page in an iframe (static/admin/preview.js) and
     posts it the unsaved entry on every change; it renders it with the same Post component
     as /posts/[slug]. Works on a static host: no server writes anything. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import Post from '#lib/Post.svelte';

	type Entry = { title: string; date: string; body: string };
	let entry = $state<Entry>();

	onMount(() => {
		function receive(event: MessageEvent) {
			// Only the CMS, which is served from this same origin, may draw here.
			if (event.origin !== location.origin || event.data?.type !== 'cms-preview') return;
			const { title, date, body } = event.data;
			entry = { title: String(title ?? ''), date: String(date ?? ''), body: String(body ?? '') };
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
	<Post {...entry} />
{:else}
	<p>Waiting for the CMS… (this page shows the entry being edited in /admin/)</p>
{/if}
