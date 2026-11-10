import { posts } from '#lib/posts.ts';

export function load() {
	return { posts: posts.map(({ slug, title, date }) => ({ slug, title, date })) };
}
