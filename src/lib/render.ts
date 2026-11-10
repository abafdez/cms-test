// Markdown → HTML. The one renderer for both the built page (at prerender time, in Node)
// and the live preview (in the browser, as you type in the CMS), so they can't disagree.
import { Marked } from 'marked';

// Images the CMS uploads are written root-relative (`/uploads/x.png`, public_folder in
// config.yml), with no base path, so the content works wherever the site is served from.
// `url` adds the base: Post.svelte passes SvelteKit's asset(). Left alone: relative
// paths, other sites and protocol-relative URLs (`//cdn…`).
export function renderMarkdown(body: string, url: (path: string) => string = (path) => path) {
	const marked = new Marked({
		async: false,
		walkTokens(token) {
			if (token.type === 'image' && /^\/(?!\/)/.test(token.href)) token.href = url(token.href);
		}
	});
	return marked.parse(body) as string;
}
