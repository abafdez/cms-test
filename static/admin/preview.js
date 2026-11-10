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
CMS.init();
