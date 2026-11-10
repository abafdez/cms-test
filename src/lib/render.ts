// Markdown → HTML. The one renderer for both the built page (at prerender time, in Node)
// and the live preview (in the browser, as you type in the CMS), so they can't disagree.
import { marked } from 'marked';

export function renderMarkdown(body: string): string {
	return marked.parse(body, { async: false });
}
