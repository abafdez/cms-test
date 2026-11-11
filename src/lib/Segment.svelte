<!-- One piece of a post's body (render.ts): markdown as HTML, one of our components, or
     what's wrong with a block. Drawn by Post.svelte, and by the preview's editor, so both
     draw them the same way. -->
<script lang="ts">
	import type { Component } from 'svelte';
	import { blocks } from '#lib/blocks.ts';
	import type { Segment } from '#lib/render.ts';

	let { segment }: { segment: Segment } = $props();
</script>

{#if segment.kind === 'html'}
	<!-- Our own content, written by us in the CMS: no sanitising for this test. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html segment.html}
{:else if segment.kind === 'block'}
	{@const Block = blocks[segment.name].component as Component<Record<string, string>>}
	<Block {...segment.values} />
{:else}
	<!-- Only in the live preview: the build stops on a bad block (posts.ts). -->
	<p class="block-error" role="alert">{segment.message}</p>
{/if}

<style>
	.block-error {
		padding: 0.75rem 1rem;
		border-left: 4px solid var(--danger);
		background: var(--surface-2);
		white-space: pre-wrap;
	}
</style>
