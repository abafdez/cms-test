// The blocks' names, labels and fields, from the registry (src/lib/blocks.ts), for the
// CMS: static/admin/preview.js turns each one into an editor component. Prerendered to
// build/admin/blocks.json, next to the CMS's own files, so the CMS keeps no copy of them.
import { json } from '@sveltejs/kit';
import { blocks } from '#lib/blocks.ts';

export const prerender = true;

export function GET() {
	return json(
		Object.fromEntries(
			Object.entries(blocks).map(([name, { label, fields }]) => [name, { label, fields }])
		)
	);
}
