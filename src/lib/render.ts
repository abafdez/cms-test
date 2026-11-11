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

// Every segment knows where it came from: body.slice(start, end) is its markdown (after
// line endings are normalised to \n, as marked does). The editable preview uses it to
// write an edit back into the body (src/routes/preview/+page.svelte).
type Source = { start: number; end: number };
export type Segment = Source &
	(
		| { kind: 'html'; html: string }
		| { kind: 'block'; name: string; values: Record<string, string> }
		| { kind: 'error'; message: string }
	);

// Images the CMS uploads are written root-relative (`/uploads/x.png`, public_folder in
// config.yml), with no base path, so the content works wherever the site is served from.
// `url` adds the base: Post.svelte passes SvelteKit's asset(). Left alone: relative
// paths, other sites and protocol-relative URLs (`//cdn…`).
//
// `split`: one html segment per markdown block (paragraph, heading, list…) instead of one
// per run of them, so each can be edited on its own. Same HTML, cut finer.
export function renderMarkdown(
	body: string,
	url: (path: string) => string = (path) => path,
	{ split = false } = {}
): Segment[] {
	const marked = new Marked({ async: false });
	const tokens = marked.lexer(body);
	marked.walkTokens(tokens, (token) => {
		if (token.type === 'image' && /^\/(?!\/)/.test(token.href)) token.href = url(token.href);
	});

	const segments: Segment[] = [];
	let run: Token[] = [];
	let runStart = 0;
	let offset = 0; // the tokens' raw texts, end to end, are the body
	const flush = () => {
		// Blank lines alone draw nothing, and aren't worth editing.
		if (run.some((token) => token.type !== 'space')) {
			segments.push({ kind: 'html', html: marked.parser(run), start: runStart, end: offset });
		}
		run = [];
		runStart = offset;
	};
	for (const token of tokens) {
		const code = token.type === 'code' ? (token as Tokens.Code) : undefined;
		const name = code?.lang;
		if (!code || !isBlock(name)) {
			if (split) flush();
			run.push(token);
			offset += token.raw.length;
			continue;
		}
		flush();
		const source = { start: offset, end: offset + token.raw.length };
		offset = source.end;
		runStart = offset;
		try {
			segments.push({ kind: 'block', name, values: readBlock(name, code.text), ...source });
		} catch (error) {
			segments.push({ kind: 'error', message: (error as Error).message, ...source });
		}
	}
	flush();
	return segments;
}
