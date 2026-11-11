import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './render.ts';

const yt = (lines: string) => `Before\n\n\`\`\`yt\n${lines}\n\`\`\`\n\nAfter`;

describe('renderMarkdown', () => {
	it('cuts a block out of the markdown around it', () => {
		const segments = renderMarkdown(
			yt('src: https://youtu.be/gd5uJ7Nlvvo\ntitle: "Plain Text: a talk"')
		);
		expect(segments.map((s) => s.kind)).toEqual(['html', 'block', 'html']);
		expect(segments[1]).toMatchObject({
			kind: 'block',
			name: 'yt',
			values: { src: 'https://youtu.be/gd5uJ7Nlvvo', title: 'Plain Text: a talk' }
		});
	});

	it('names what is wrong with a block, instead of throwing', () => {
		const [, missing] = renderMarkdown(yt('src: https://youtu.be/gd5uJ7Nlvvo'));
		expect(missing).toMatchObject({
			kind: 'error',
			message: 'The ```yt block needs a "title" field'
		});
		const [, notYoutube] = renderMarkdown(yt('src: https://vimeo.com/1\ntitle: x'));
		expect(notYoutube.kind === 'error' && notYoutube.message).toMatch(/should be a YouTube link/);
		const [, unknown] = renderMarkdown(yt('src: https://youtu.be/gd5uJ7Nlvvo\ntitle: x\nsize: 2'));
		expect(unknown.kind === 'error' && unknown.message).toMatch(/has no "size" field/);
		const [, external] = renderMarkdown(
			yt('src: https://youtu.be/gd5uJ7Nlvvo\ntitle: x\nthumbnail: https://i.ytimg.com/a.jpg')
		);
		expect(external.kind === 'error' && external.message).toMatch(/should be an upload/);
	});

	it('leaves other code blocks as code', () => {
		const [segment] = renderMarkdown('```js\nlet a = 1;\n```');
		expect(segment.kind === 'html' && segment.html).toContain('<code class="language-js">');
	});

	it('adds the base path to uploaded images only', () => {
		const [segment] = renderMarkdown(
			'![a](/uploads/a.png) ![b](./b.png) ![c](//cdn.example/c.png)',
			(path) => `/cms-test${path}`
		);
		const html = segment.kind === 'html' ? segment.html : '';
		expect(html).toContain('src="/cms-test/uploads/a.png"');
		expect(html).toContain('src="./b.png"');
		expect(html).toContain('src="//cdn.example/c.png"');
	});

	it('knows where each segment came from in the body', () => {
		const body = yt('src: https://youtu.be/gd5uJ7Nlvvo\ntitle: x');
		const segments = renderMarkdown(body);
		expect(segments.map((s) => body.slice(s.start, s.end))).toEqual([
			'Before\n\n',
			'```yt\nsrc: https://youtu.be/gd5uJ7Nlvvo\ntitle: x\n```',
			'\n\nAfter'
		]);
	});

	it('gives each markdown block its own segment when split', () => {
		const body = '# Title\n\nOne\n\n- a\n- b\n';
		const joined = renderMarkdown(body);
		const split = renderMarkdown(body, undefined, { split: true });
		expect(joined).toHaveLength(1);
		expect(split.map((s) => body.slice(s.start, s.end))).toEqual(['# Title', 'One', '- a\n- b\n']);
		const html = (segments: typeof split) =>
			segments.map((s) => (s.kind === 'html' ? s.html : '')).join('');
		expect(html(split)).toBe(html(joined));
	});
});
