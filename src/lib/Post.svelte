<!-- A post as the site shows it. Used by /posts/[slug] (saved content) and /preview (the
     unsaved entry sent by the CMS), so the preview is the real page, not a copy of it. -->
<script lang="ts">
	import { asset } from '$app/paths';
	import type { AssetPath } from '$app/types';
	import { renderMarkdown } from '#lib/render.ts';

	let { title, date, body }: { title: string; date: string; body: string } = $props();

	// asset() adds the base path (/cms-test on GitHub Pages, nothing in dev) to the CMS's
	// /uploads/… images. The cast: AssetPath only knows the files static/ had at build
	// time, and the preview shows uploads the build has never seen.
	const html = $derived(renderMarkdown(body, (path) => asset(path as AssetPath)));
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
