<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<main>
	<h1>CMS test</h1>
	<p>Sveltia CMS on GitHub Pages, with a live preview of the real page.</p>
	<ul>
		{#each data.posts as post (post.slug)}
			<li>
				<a href={resolve('/posts/[slug]', { slug: post.slug })}>{post.title}</a>
				<small>{post.date}</small>
			</li>
		{/each}
	</ul>
	<!-- A static file, not a route: rel="external" so the router doesn't try to load it. -->
	<p><a href="{resolve('/')}admin/index.html" rel="external">Edit in the CMS</a></p>
</main>

<style>
	main {
		max-width: 65ch;
		margin: 2rem auto;
		padding-inline: 1rem;
		font-family: system-ui, sans-serif;
	}
</style>
