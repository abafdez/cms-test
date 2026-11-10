// Fenced-block components: a code block whose language is one of the names below, with
// YAML fields as its body, becomes that Svelte component instead of code.
//
//   ```yt
//   src: https://www.youtube.com/watch?v=gd5uJ7Nlvvo
//   title: Plain Text, by Dylan Beattie (NDC Copenhagen 2022)
//   thumbnail: /uploads/plain-text-talk.jpg
//   ```
//
// One registry for the three places that need it: render.ts (which blocks exist, and
// their fields checked), Post.svelte (the component, at build time and in the live
// preview) and the CMS's editor components (admin/blocks.json → static/admin/preview.js).
import type { Component } from 'svelte';
import { parse } from 'yaml';
import YouTube from '#lib/blocks/YouTube.svelte';
import { youtubeId } from '#lib/youtube.ts';

// What a field may hold. An image is an upload, written root-relative (/uploads/x.jpg);
// the component adds the base path. A youtube is a link to a video.
type Kind = 'text' | 'image' | 'youtube';
type Field = { kind: Kind; required: boolean; label: string };
export type Block = { label: string; fields: Record<string, Field>; component: Component<never> };

export const blocks: Record<string, Block> = {
	// A YouTube video without YouTube on the page: its picture and title, as a link to
	// youtube.com. Nothing loads from Google until the reader clicks.
	yt: {
		label: 'YouTube',
		fields: {
			src: { kind: 'youtube', required: true, label: 'YouTube link' },
			title: { kind: 'text', required: true, label: 'Title' },
			thumbnail: { kind: 'image', required: false, label: 'Thumbnail (16:9)' },
			caption: { kind: 'text', required: false, label: 'Caption' }
		},
		component: YouTube as Component<never>
	}
};

export const isBlock = (name: string | undefined): name is string =>
	!!name && Object.hasOwn(blocks, name);

// The values of a ```name block, checked against its fields. Throws a readable message
// on bad YAML, unknown or missing fields and values of the wrong kind: the build stops on
// it (posts.ts), and the live preview shows it where the block would be.
export function readBlock(name: string, code: string): Record<string, string> {
	const { fields } = blocks[name];
	const fail = (problem: string): never => {
		throw new Error(`The \`\`\`${name} block ${problem}`);
	};

	let values: unknown;
	try {
		values = parse(code);
	} catch (error) {
		fail(`isn't valid YAML: ${(error as Error).message}`);
	}
	if (typeof values !== 'object' || values === null || Array.isArray(values)) {
		return fail('needs its fields, one per line: "name: value"');
	}
	const given = values as Record<string, unknown>;

	for (const field of Object.keys(given)) {
		if (!Object.hasOwn(fields, field)) {
			fail(`has no "${field}" field. Its fields: ${Object.keys(fields).join(', ')}`);
		}
	}
	const checked: Record<string, string> = {};
	for (const [field, { kind, required }] of Object.entries(fields)) {
		const value = given[field];
		if (value === undefined || value === null || value === '') {
			if (required) fail(`needs a "${field}" field`);
			continue;
		}
		if (typeof value !== 'string') fail(`"${field}" should be text`);
		const text = value as string;
		if (kind === 'youtube' && !youtubeId(text)) {
			fail(`"${field}" should be a YouTube link (got "${text}")`);
		}
		if (kind === 'image' && !/^\/(?!\/)/.test(text)) {
			fail(`"${field}" should be an upload, like /uploads/picture.jpg (got "${text}")`);
		}
		checked[field] = text;
	}
	return checked;
}
