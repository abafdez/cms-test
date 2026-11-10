<!-- The ```yt block: a link card, no embedded player (an embed loads Google's scripts and
     cookies on every visit, watched or not). The thumbnail is one of our uploads for the
     same reason. Without one, a plain tile. -->
<script lang="ts">
	import { uploadUrl } from '#lib/uploads.ts';
	import { youtubeUrl } from '#lib/youtube.ts';

	let {
		src,
		title,
		thumbnail,
		caption
	}: { src: string; title: string; thumbnail?: string; caption?: string } = $props();

	const picture = $derived(thumbnail ? uploadUrl(thumbnail) : undefined);
</script>

<figure class="yt">
	<a href={youtubeUrl(src)} target="_blank" rel="external noopener noreferrer">
		<span class="picture">
			<!-- alt="": the title next to it already names the link. -->
			{#if picture}<img src={picture} alt="" />{/if}
			<svg class="play" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.5v11l9-5.5z" /></svg>
		</span>
		<span class="title">{title}</span>
		<span class="where">Watch on YouTube · opens in a new tab</span>
	</a>
	{#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>

<style>
	.yt {
		margin: 2rem 0;
	}
	a {
		display: grid;
		gap: 0.25rem;
		color: inherit;
		text-decoration: none;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
		overflow: hidden;
	}
	a:hover .title,
	a:focus-visible .title {
		text-decoration: underline;
	}
	.picture {
		position: relative;
		display: grid;
		place-items: center;
		aspect-ratio: 16 / 9;
		/* The tile when there's no thumbnail. */
		background:
			linear-gradient(var(--grid) 1px, transparent 1px) 0 0 / 1.5rem 1.5rem,
			linear-gradient(90deg, var(--grid) 1px, transparent 1px) 0 0 / 1.5rem 1.5rem,
			var(--surface-3);
	}
	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.play {
		position: relative;
		width: 4rem;
		padding: 0.75rem;
		border-radius: 50%;
		fill: var(--on-accent);
		background: var(--accent);
		transition: scale 150ms;
	}
	a:hover .play {
		scale: 1.1;
	}
	.title {
		padding: 0.5rem 1rem 0;
		font-weight: 600;
	}
	.where {
		padding: 0 1rem 0.75rem;
		font-size: 0.875rem;
		color: var(--text-2);
	}
	figcaption {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		color: var(--text-2);
	}
</style>
