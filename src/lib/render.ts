// Markdown → what Post.svelte draws. The one renderer for both the built page (at
// prerender time, in Node) and the live preview (in the browser, as you type in the CMS),
// so they can't disagree.
//
// The body is cut into segments: runs of plain markdown become HTML, and each of our
// fenced blocks (```yt…, blocks.ts) becomes a block segment that Post.svelte renders
// with its Svelte component. No mdsvex: the same code runs at build time and in the
// browser. Only top-level blocks count (not one inside a list or a quote).
import { Marked, type Token, type Tokens } from 'marked';
import { isBlock, readBlock } from '#lib/blocks.ts';

export type Segment =
	| { kind: 'html'; html: string }
	| { kind: 'block'; name: string; values: Record<string, string> }
	| { kind: 'error'; message: string };

// Images the CMS uploads are written root-relative (`/uploads/x.png`, public_folder in
// config.yml), with no base path, so the content works wherever the site is served from.
// `url` adds the base: Post.svelte passes SvelteKit's asset(). Left alone: relative
// paths, other sites and protocol-relative URLs (`//cdn…`).
export function renderMarkdown(
	body: string,
	url: (path: string) => string = (path) => path
): Segment[] {
	const marked = new Marked({ async: false });
	const tokens = marked.lexer(body);
	marked.walkTokens(tokens, (token) => {
		if (token.type === 'image' && /^\/(?!\/)/.test(token.href)) token.href = url(token.href);
	});

	const segments: Segment[] = [];
	let run: Token[] = [];
	const flush = () => {
		if (run.length) segments.push({ kind: 'html', html: marked.parser(run) });
		run = [];
	};
	for (const token of tokens) {
		const code = token.type === 'code' ? (token as Tokens.Code) : undefined;
		const name = code?.lang;
		if (!code || !isBlock(name)) {
			run.push(token);
			continue;
		}
		flush();
		try {
			segments.push({ kind: 'block', name, values: readBlock(name, code.text) });
		} catch (error) {
			segments.push({ kind: 'error', message: (error as Error).message });
		}
	}
	flush();
	return segments;
}
