// Edits to the body as markdown, block by block: what the editable preview does to it.
// A block is a segment of renderMarkdown(body, …, { split: true }), so block i here is
// the i-th thing drawn in the preview. Only the blocks touched are rewritten; the rest of
// the body stays as written, byte for byte.
import { renderMarkdown } from '#lib/render.ts';

/** Where each block's markdown is in the body (line endings as \n, as marked sees them). */
export const ranges = (body: string) =>
	renderMarkdown(body, undefined, { split: true }).map(({ start, end }) => ({ start, end }));

/** How many blocks some markdown is: 0 for none, 2 after Enter split a paragraph… */
export const count = (markdown: string) => ranges(markdown).length;

const trimLines = (text: string) => text.replace(/^\n+|\n+$/g, '');

// body[start, end) → markdown, with one blank line between it and its neighbours. An empty
// markdown removes the range, blank lines included.
function splice(body: string, start: number, end: number, markdown: string) {
	const head = body.slice(0, start).replace(/\n+$/, '');
	const tail = body.slice(end).replace(/^\n+/, '');
	const joined = [head, trimLines(markdown), tail].filter(Boolean).join('\n\n');
	// The body's final newline, when the end of it was rewritten.
	return !tail && body.endsWith('\n') && joined ? `${joined}\n` : joined;
}

/**
 * Blocks index…index+count → `markdown` (any number of blocks, or none). With count 0,
 * `markdown` goes in before block `index` (at the end when index is the number of blocks).
 */
export function replaceBlocks(body: string, index: number, count: number, markdown: string) {
	body = body.replace(/\r\n?/g, '\n');
	const all = ranges(body);
	if (index < 0 || count < 0 || index + count > all.length) {
		throw new RangeError(`No blocks ${index}…${index + count} (the body has ${all.length})`);
	}
	if (!count && !trimLines(markdown)) return body;
	const start = all[index]?.start ?? body.length;
	const end = count ? all[index + count - 1].end : start;
	return splice(body, start, end, markdown);
}

/** Block `from` moved to position `to` (its index once it's there). */
export function moveBlock(body: string, from: number, to: number) {
	body = body.replace(/\r\n?/g, '\n');
	const all = ranges(body);
	if (from === to || !all[from] || to < 0 || to >= all.length) return body;
	const markdown = body.slice(all[from].start, all[from].end);
	return replaceBlocks(replaceBlocks(body, from, 1, ''), to, 0, markdown);
}
