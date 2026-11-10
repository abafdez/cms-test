<!-- A post as the site shows it. Used by /posts/[slug] (saved content) and /preview (the
     unsaved entry sent by the CMS), so the preview is the real page, not a copy of it. -->
<script lang="ts">
	import { blocks } from '#lib/blocks.ts';
	import { renderMarkdown } from '#lib/render.ts';
	import { uploadUrl } from '#lib/uploads.ts';

	let { title, date, body }: { title: string; date: string; body: string } = $props();

	const segments = $derived(renderMarkdown(body, uploadUrl));
</script>

<article class="prose">
	<p class="date">{date}</p>
	<h1>{title}</h1>
	{#each segments as segment, i (i)}
		{#if segment.kind === 'html'}
			<!-- Our own content, written by us in the CMS: no sanitising for this test. -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html segment.html}
		{:else if segment.kind === 'block'}
			{@const Block = blocks[segment.name].component as import('svelte').Component<
				Record<string, string>
			>}
			<Block {...segment.values} />
		{:else}
			<!-- Only in the live preview: the build stops on a bad block (posts.ts). -->
			<p class="block-error" role="alert">{segment.message}</p>
		{/if}
	{/each}
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
	.block-error {
		padding: 0.75rem 1rem;
		border-left: 4px solid var(--danger);
		background: var(--surface-2);
		white-space: pre-wrap;
	}
</style>
