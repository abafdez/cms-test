// YouTube links, from any of their shapes (from the portfolio's blocks.ts).

// The video's id: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, /embed/ID,
// /live/ID. Undefined if it isn't a YouTube link.
export function youtubeId(src: string): string | undefined {
	let url: URL;
	try {
		url = new URL(src);
	} catch {
		return;
	}
	const host = url.hostname.replace(/^(www|m)\./, '');
	const id =
		host === 'youtu.be'
			? url.pathname.slice(1)
			: host === 'youtube.com'
				? (url.searchParams.get('v') ??
					url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1])
				: undefined;
	return id && /^[\w-]{11}$/.test(id) ? id : undefined;
}

// One link shape for every video, keeping a start time (?t=90) if the link had one.
export function youtubeUrl(src: string): string {
	const url = new URL(`https://www.youtube.com/watch?v=${youtubeId(src)}`);
	const start = new URL(src).searchParams.get('t');
	if (start) url.searchParams.set('t', start);
	return url.href;
}
