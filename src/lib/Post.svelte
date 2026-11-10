<!-- A post as the site shows it. Used by /posts/[slug] (saved content) and /preview (the
     unsaved entry sent by the CMS), so the preview is the real page, not a copy of it. -->
<script lang="ts">
	import { renderMarkdown } from '#lib/render.ts';

	let { title, date, body }: { title: string; date: string; body: string } = $props();

	const html = $derived(renderMarkdown(body));
</script>

<article>
	<p class="date">{date}</p>
	<h1>{title}</h1>
	<!-- Our own content, written by us in the CMS: no sanitising for this test. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html html}
</article>

<style>
	article {
		max-width: 65ch;
		margin: 2rem auto;
		padding-inline: 1rem;
		font-family: system-ui, sans-serif;
		line-height: 1.6;
	}
	.date {
		color: #666;
		margin: 0;
	}
</style>
