import { error } from '@sveltejs/kit';
import { posts } from '#lib/posts.ts';

// Which pages to prerender: one per file in content/posts/.
export function entries() {
	return posts.map(({ slug }) => ({ slug }));
}

export function load({ params }) {
	const post = posts.find(({ slug }) => slug === params.slug);
	if (!post) error(404, 'No such post');
	return { post };
}
