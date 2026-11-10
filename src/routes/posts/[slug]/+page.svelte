<script lang="ts">
	import Post from '#lib/Post.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.post.title}</title></svelte:head>

<Post {...data.post} />
