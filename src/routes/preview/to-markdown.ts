// HTML edited in the preview → markdown for the body. Only the edited block goes through
// here (the rest of the body is left as written), so it only has to be faithful, not
// identical: it writes the same style as our content (- lists, _em_, **strong**, ```).
import TurndownService from 'turndown';
import { uploadUrl } from '#lib/uploads.ts';

const turndown = new TurndownService({
	headingStyle: 'atx',
	bulletListMarker: '-',
	emDelimiter: '_',
	strongDelimiter: '**',
	codeBlockStyle: 'fenced',
	fence: '```'
});

// "- item", not turndown's "-   item"; continuation lines indented to match.
turndown.addRule('listItem', {
	filter: 'li',
	replacement(content, node, options) {
		const list = node.parentNode as HTMLElement;
		let prefix = `${options.bulletListMarker} `;
		if (list.nodeName === 'OL') {
			const start = Number(list.getAttribute('start') ?? 1);
			prefix = `${start + Array.prototype.indexOf.call(list.children, node)}. `;
		}
		const text = content
			.replace(/^\n+/, '')
			.replace(/\n+$/, '\n')
			.replace(/\n(?!$)/g, `\n${' '.repeat(prefix.length)}`);
		return prefix + text + (node.nextSibling && !text.endsWith('\n') ? '\n' : '');
	}
});

// Uploads were drawn with the base path added (render.ts); the content is written without
// it (/uploads/x.png), so it works wherever the site is served from.
const uploads = uploadUrl('/uploads/');
turndown.addRule('upload', {
	filter: (node) => node.nodeName === 'IMG' && !!node.getAttribute('src')?.startsWith(uploads),
	replacement(_content, node) {
		const img = node as HTMLImageElement;
		const src = `/uploads/${img.getAttribute('src')!.slice(uploads.length)}`;
		const title = img.title ? ` "${img.title.replaceAll('"', '\\"')}"` : '';
		return `![${img.alt.replace(/([[\]])/g, '\\$1')}](${src}${title})`;
	}
});

export const toMarkdown = (html: string) => turndown.turndown(html).trim();
