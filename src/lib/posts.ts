// Reading content/posts/*.md: frontmatter (YAML) + markdown body. Server-side only (the
// pages that use it are prerendered), so the raw files never ship to the browser.
import { parse } from 'yaml';
import { renderMarkdown } from '#lib/render.ts';

export type Post = { slug: string; title: string; date: string; body: string };

const files = import.meta.glob<string>('/content/posts/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
});

// '---\n<yaml>\n---\n<body>' → its parts. A file without frontmatter is all body.
export function readPost(slug: string, raw: string): Post {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
	const meta = (match ? parse(match[1]) : {}) ?? {};
	return {
		slug,
		title: String(meta.title ?? slug),
		date: String(meta.date ?? ''),
		body: match ? match[2] : raw
	};
}

export const posts: Post[] = Object.entries(files)
	.map(([path, raw]) => readPost(path.split('/').pop()!.replace(/\.md$/, ''), raw))
	.sort((a, b) => b.date.localeCompare(a.date));

// Our rules stay in charge: a block the preview shows as an error stops the build, naming
// the file, so a broken post never reaches the site.
for (const { slug, body } of posts) {
	for (const segment of renderMarkdown(body)) {
		if (segment.kind === 'error') throw new Error(`content/posts/${slug}.md: ${segment.message}`);
	}
}
