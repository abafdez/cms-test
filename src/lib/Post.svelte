<!-- A post as the site shows it. Used by /posts/[slug] (saved content) and /preview (the
     unsaved entry sent by the CMS), so the preview is the real page, not a copy of it.

     `children` (the preview only) draws the title and the body instead: the preview's
     editor, which draws them editable, with the same Segment for each piece. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Segment from '#lib/Segment.svelte';
	import { renderMarkdown } from '#lib/render.ts';
	import { uploadUrl } from '#lib/uploads.ts';

	let {
		title,
		date,
		body,
		children
	}: { title: string; date: string; body: string; children?: Snippet } = $props();

	const segments = $derived(children ? [] : renderMarkdown(body, uploadUrl));
</script>

<article class="prose">
	<p class="date">{date}</p>
	{#if children}
		{@render children()}
	{:else}
		<h1>{title}</h1>
		{#each segments as segment, i (i)}
			<Segment {segment} />
		{/each}
	{/if}
</article>

<style>
	article {
		max-width: 65ch;
		margin: 2rem auto;
		padding-inline: 1rem;
	}
	.date {
		margin: 0;
		color: var(--text-2);
		font-size: 0.875rem;
	}
</style>
