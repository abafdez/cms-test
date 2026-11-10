// The live preview: the CMS's preview pane shows the site's own /preview page in an iframe
// and posts it the entry being edited on every change. That page renders it with the same
// Svelte component as the real post page (src/routes/preview/+page.svelte).
//
//   CMS form → entry → postMessage → /preview (Post.svelte + render.ts) → what the site shows
//
// Plain JavaScript, no build: Vite copies static/ as is. The CMS needs none of the site's
// code; the site renders itself.
const CMS = window.CMS;
const { createElement: h, useEffect, useRef } = CMS.React;

// Worked out here, in the admin page: /cms-test/admin/index.html → /cms-test/preview, and
// /admin/index.html → /preview in dev. (Inside the preview pane, location is a blob: URL.)
const previewUrl = new URL('../preview', location.href).href;
const origin = location.origin;

// Immutable Map → plain object.
const plain = (value) => value?.toJS?.() ?? value ?? {};

function PostPreview({ entry }) {
	const frame = useRef(null);
	const { title = '', date = '', body = '' } = plain(entry.get('data'));
	const message = { type: 'cms-preview', title: String(title), date: String(date), body: String(body) };

	// The latest values, for when the page says it's ready (after the first render).
	const latest = useRef(message);
	latest.current = message;
	const send = () => frame.current?.contentWindow?.postMessage(latest.current, origin);

	// The page asks for the entry once it has loaded. Its parent is the preview pane's
	// document, so listen there (and on this window, in case the pane isn't a frame).
	useEffect(() => {
		const receive = (event) => {
			if (event.source === frame.current?.contentWindow && event.data?.type === 'cms-preview-ready') send();
		};
		const windows = new Set([window, frame.current?.ownerDocument?.defaultView].filter(Boolean));
		for (const win of windows) win.addEventListener('message', receive);
		return () => {
			for (const win of windows) win.removeEventListener('message', receive);
		};
	}, []);

	// Every edit. Before the page has loaded nobody's listening; the ready message covers that.
	useEffect(send, [message.title, message.date, message.body]);

	return h('iframe', {
		ref: frame,
		src: previewUrl,
		title: 'Live preview',
		style: { position: 'fixed', inset: 0, width: '100%', height: '100%', border: 0 }
	});
}

CMS.registerPreviewTemplate('posts', PostPreview);

// Our fenced blocks (```yt…) as editor components: a button in the body's toolbar and a
// form in a dialog, instead of typing YAML. Their fields come from the site's registry
// (src/lib/blocks.ts), prerendered as admin/blocks.json next to this file.
const widgets = {
	text: { widget: 'string' },
	youtube: { widget: 'string', hint: 'Any YouTube link' },
	image: { widget: 'image' }
};

// One YAML value on one line: plain when YAML reads it back as the same text, otherwise
// double-quoted (a JSON string is valid YAML). The site reads it with a real YAML parser.
const scalar = (value) =>
	value !== '' &&
	!/^[\s\-?:,[\]{}#&*!|>'"%@`]|\s$|: | #/.test(value) &&
	!/^(true|false|yes|no|on|off|null|~|[-+]?(\d[\d_.]*|\.\d+)(e[-+]?\d+)?)$/i.test(value)
		? value
		: JSON.stringify(value);

// …and back: "name: value" lines; quoted values unquoted.
function readLines(yaml) {
	const values = {};
	for (const line of yaml.split('\n')) {
		const [, name, raw = ''] = line.match(/^(\w+):\s*(.*?)\s*$/) ?? [];
		if (!name) continue;
		values[name] = raw.startsWith('"')
			? JSON.parse(raw)
			: raw.startsWith("'")
				? raw.slice(1, -1).replaceAll("''", "'")
				: raw;
	}
	return values;
}

const escape = (text) =>
	String(text ?? '').replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function editorComponent(name, { label, fields }) {
	const names = Object.keys(fields);
	return {
		id: name,
		label,
		icon: 'smart_display',
		mode: 'dialog',
		summary: `${label}: {{title}}`,
		fields: names.map((field) => ({
			name: field,
			label: fields[field].label,
			required: fields[field].required,
			...widgets[fields[field].kind]
		})),
		// A whole fenced block: ```name, its YAML, ``` (m: ^ and $ match at line ends).
		pattern: new RegExp(`^\`\`\`${name}\\n(?<yaml>[\\s\\S]*?)\\n\`\`\`$`, 'm'),
		fromBlock: (match) => readLines(match.groups?.yaml ?? ''),
		toBlock(values) {
			const lines = names
				.filter((field) => values[field] !== undefined && values[field] !== null && values[field] !== '')
				.map((field) => `${field}: ${scalar(String(values[field]))}`);
			return `\`\`\`${name}\n${lines.join('\n')}\n\`\`\``;
		},
		// Inside the editor only; the preview pane shows the real component.
		toPreview: (values) => `<p>▶ ${escape(label)}: ${escape(values.title || values.src)}</p>`
	};
}

// The blocks first, then the CMS: editor components must be registered before init().
// If the file can't be read, the CMS still starts, with blocks editable as plain text.
fetch(new URL('blocks.json', location.href))
	.then((response) => response.json())
	.then((blocks) => {
		for (const [name, block] of Object.entries(blocks)) {
			CMS.registerEditorComponent(editorComponent(name, block));
		}
	})
	.catch((error) => console.error('Could not load the blocks for the editor:', error))
	.finally(() => CMS.init());
