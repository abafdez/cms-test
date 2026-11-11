<!-- The title and body of the post, editable in place: the preview's side of editing.
     Each keystroke becomes markdown for the block being typed in, spliced into the body
     (body.ts) and sent to the CMS (onchange), as the CMS's form does in the other direction.

     The block being typed in belongs to the browser, not Svelte, until it loses focus:
     redrawing it would lose the caret (and the CMS echoes every change back). So it's one
     element even when Enter has made it two paragraphs; they become two blocks on blur.

     Blocks can also be added (+, or Enter), moved (drag the handle, the arrows, Alt+↑/↓)
     and removed (×, or Backspace in an empty one). -->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Segment from '#lib/Segment.svelte';
	import { renderMarkdown, type Segment as Part } from '#lib/render.ts';
	import { uploadUrl } from '#lib/uploads.ts';
	import { count, moveBlock, ranges, replaceBlocks } from './body.ts';
	import { toMarkdown } from './to-markdown.ts';

	type Field = 'title' | 'body';
	let {
		title,
		body,
		onchange
	}: { title: string; body: string; onchange: (field: Field, value: string) => void } = $props();

	const segments = $derived(renderMarkdown(body, uploadUrl, { split: true }));

	// The block being typed in: segments index…index+count, drawn as one element. count is
	// 0 when it's empty (a new paragraph, or one whose text was all deleted). `before`: the
	// body when it got focus, for Escape.
	let editing = $state<{ id: number; index: number; count: number; before: string }>();

	// Each block's key, so an element stays with its content when blocks around it come and
	// go or move: the same content gets the same id as last time. The edited block keeps its
	// id whatever its content becomes.
	let nextId = 0;
	let previous: { key: string; id: number }[] = [];
	const keyOf = (s: Part) =>
		s.kind === 'html'
			? `h${s.html}`
			: s.kind === 'block'
				? `b${s.name}${JSON.stringify(s.values)}`
				: `e${s.message}`;
	const ids = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- scratch, not state
		const free = new Map<string, number[]>();
		for (const { key, id } of previous) free.set(key, [...(free.get(key) ?? []), id]);
		const next = segments.map((s) => {
			const key = keyOf(s);
			return { key, id: free.get(key)?.shift() ?? nextId++ };
		});
		const edited = editing?.count ? next[editing.index] : undefined;
		if (editing && edited) {
			const holder = next.find((n) => n.id === editing!.id);
			if (holder) holder.id = edited.id;
			edited.id = editing.id;
		}
		previous = next;
		return next.map((n) => n.id);
	});

	type Item = { id: number; index: number; segment?: Part; editing?: true };
	const items = $derived.by(() => {
		const list: Item[] = segments.map((segment, index) => ({ id: ids[index], index, segment }));
		if (editing) {
			list.splice(editing.index, editing.count, {
				id: editing.id,
				index: editing.index,
				editing: true
			});
		}
		return list;
	});

	// A text block's HTML, drawn by hand (not {@html}) so that Svelte leaves it alone while
	// it's edited, and redraws it all afterwards, whatever the browser did to it.
	const drawn = new WeakMap<HTMLElement, string>();
	const draw = (item: Item) => (element: HTMLElement) => {
		if (item.editing || item.segment?.kind !== 'html' || drawn.get(element) === item.segment.html) {
			return;
		}
		element.innerHTML = item.segment.html;
		drawn.set(element, item.segment.html);
	};

	function start(item: Item) {
		if (editing?.id !== item.id) {
			editing = { id: item.id, index: item.index, count: 1, before: body };
		}
	}

	function stop(element: HTMLElement) {
		drawn.delete(element);
		editing = undefined;
	}

	function input(element: HTMLElement) {
		if (!editing) return;
		const markdown = toMarkdown(element.innerHTML);
		const next = replaceBlocks(body, editing.index, editing.count, markdown);
		const added = count(markdown);
		// It joined a neighbour (a list typed next to a list): the blocks around it changed,
		// so stop here and draw them all again.
		const joined = ranges(next).length !== segments.length - editing.count + added;
		editing.count = added;
		onchange('body', next);
		if (joined) element.blur();
	}

	async function keydown(event: KeyboardEvent, item: Item) {
		const element = event.currentTarget as HTMLElement;
		if (event.key === 'Escape' && editing) {
			const { before } = editing;
			element.blur();
			onchange('body', before);
		} else if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
			event.preventDefault();
			const { id, index } = item;
			element.blur();
			move(index, index + (event.key === 'ArrowUp' ? -1 : 1));
			await focus(id);
		} else if (event.key === 'Backspace' && !element.textContent && !element.querySelector('img')) {
			// An empty block: gone, and on to the end of the one before.
			event.preventDefault();
			const before = items[items.indexOf(item) - 1];
			element.blur();
			if (before) await focus(before.id, true);
		}
	}

	function move(from: number, to: number) {
		if (to >= 0 && to < segments.length) onchange('body', moveBlock(body, from, to));
	}

	const remove = (index: number) => onchange('body', replaceBlocks(body, index, 1, ''));

	// A new, empty paragraph before block `index`. It's in the body once it has text.
	async function add(index: number) {
		const id = nextId++;
		editing = { id, index, count: 0, before: body };
		await focus(id);
	}

	let container: HTMLElement;
	async function focus(id: number, atEnd = false) {
		await tick();
		const element = container.querySelector<HTMLElement>(`[data-id="${id}"] .text`);
		if (!element) return;
		element.focus();
		if (atEnd) getSelection()?.selectAllChildren(element);
		if (atEnd) getSelection()?.collapseToEnd();
	}

	// Dragging a block by its handle: dropAt is the position it would go before.
	let dragging = $state<number>();
	let dropAt = $state<number>();
	const moves = $derived(
		dragging !== undefined && dropAt !== undefined && dropAt !== dragging && dropAt !== dragging + 1
	);

	function dragstart(event: DragEvent, item: Item) {
		const block = (event.currentTarget as HTMLElement).closest<HTMLElement>('.block')!;
		dragging = item.index;
		event.dataTransfer!.effectAllowed = 'move';
		event.dataTransfer!.setData('text/plain', ''); // Firefox drags nothing without data
		event.dataTransfer!.setDragImage(block, 16, 16);
	}

	function dragover(event: DragEvent, item: Item) {
		if (dragging === undefined || item.editing) return;
		event.preventDefault();
		const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
		dropAt = event.clientY < box.top + box.height / 2 ? item.index : item.index + 1;
	}

	function drop(event: DragEvent) {
		event.preventDefault();
		if (moves) move(dragging!, dropAt! > dragging! ? dropAt! - 1 : dropAt!);
		dragging = dropAt = undefined;
	}

	// The title: one line of text, drawn by hand for the same reason as the blocks.
	const showTitle = (element: HTMLElement) => {
		const text = title;
		if (document.activeElement !== element) element.textContent = text;
	};
	const titleOf = (element: HTMLElement) => (element.textContent ?? '').replace(/\s+/g, ' ').trim();

	onMount(() => {
		// Enter makes paragraphs, not <div>s (which turndown would run together).
		document.execCommand('defaultParagraphSeparator', false, 'p');
	});
</script>

<!-- svelte-ignore a11y_missing_content (its text is drawn by showTitle) -->
<h1
	class="text"
	contenteditable="plaintext-only"
	data-placeholder="Title"
	{@attach showTitle}
	oninput={(event) => onchange('title', titleOf(event.currentTarget))}
	onblur={(event) => (event.currentTarget.textContent = title)}
	onkeydown={(event) => {
		if (event.key === 'Enter') {
			event.preventDefault(); // a title is one line
			event.currentTarget.blur();
		}
	}}
></h1>

<div bind:this={container} ondragend={() => (dragging = dropAt = undefined)} role="none">
	{#each items as item (item.id)}
		<div
			class="block"
			class:drop-before={moves && dropAt === item.index && !item.editing}
			class:drop-after={moves && dropAt === segments.length && item.index === segments.length - 1}
			class:dragged={dragging === item.index && !item.editing}
			data-id={item.id}
			ondragover={(event) => dragover(event, item)}
			ondrop={drop}
			role="none"
		>
			{#if item.editing || item.segment?.kind === 'html'}
				<div
					class="text"
					contenteditable="true"
					role="textbox"
					aria-multiline="true"
					tabindex="0"
					data-placeholder="Write something…"
					{@attach draw(item)}
					onfocus={() => start(item)}
					onblur={(event) => stop(event.currentTarget)}
					oninput={(event) => input(event.currentTarget)}
					onkeydown={(event) => keydown(event, item)}
				></div>
			{:else if item.segment}
				<Segment segment={item.segment} />
			{/if}
			{#if !(item.editing && editing?.count === 0)}
				<div class="tools" role="toolbar" aria-label="Block">
					<button
						class="handle"
						draggable="true"
						title="Drag to move"
						aria-label="Move (drag)"
						ondragstart={(event) => dragstart(event, item)}>⠿</button
					>
					<button
						title="Move up (Alt+↑)"
						aria-label="Move up"
						disabled={item.index === 0}
						onclick={() => move(item.index, item.index - 1)}>↑</button
					>
					<button
						title="Move down (Alt+↓)"
						aria-label="Move down"
						disabled={item.index >= segments.length - 1}
						onclick={() => move(item.index, item.index + 1)}>↓</button
					>
					<button
						title="Add a paragraph below"
						aria-label="Add a paragraph below"
						onclick={() => add(item.index + 1)}>+</button
					>
					<button title="Remove" aria-label="Remove" onclick={() => remove(item.index)}>×</button>
				</div>
			{/if}
		</div>
	{/each}
</div>

<button class="add" onclick={() => add(segments.length)}>+ Add a paragraph</button>

<style>
	.text {
		outline: 1px dashed transparent;
		outline-offset: 4px;
		border-radius: 2px;
	}
	.text:hover {
		outline-color: var(--border);
	}
	.text:focus {
		outline: 2px solid var(--accent);
	}
	.text:empty::before {
		content: attr(data-placeholder);
		color: var(--text-2);
	}
	div.text:empty {
		margin-block: 1em; /* where a paragraph would be */
	}

	.block {
		position: relative;
	}
	.dragged {
		opacity: 0.4;
	}
	.drop-before::before,
	.drop-after::after {
		content: '';
		position: absolute;
		inset-inline: 0;
		height: 3px;
		border-radius: 2px;
		background: var(--accent);
	}
	.drop-before::before {
		top: -0.6rem;
	}
	.drop-after::after {
		bottom: -0.6rem;
	}

	/* The block's buttons, above its top right corner when it's pointed at or edited. */
	.tools {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 1;
		display: flex;
		translate: 0 calc(-100% - 6px);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
		visibility: hidden;
		font: 0.875rem/1 var(--font-ui);
	}
	.block:hover > .tools,
	.block:focus-within > .tools {
		visibility: visible;
	}
	.tools button,
	.add {
		border: 0;
		background: none;
		color: var(--text-1);
		font: inherit;
		cursor: pointer;
	}
	.tools button {
		min-width: 1.75rem;
		padding: 0.3rem 0.4rem;
		border-radius: calc(var(--radius) - 1px);
	}
	.tools button:hover:not(:disabled) {
		background: var(--surface-3);
	}
	.tools button:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.tools .handle {
		cursor: grab;
	}

	.add {
		margin-top: 1rem;
		padding: 0.4rem 0;
		color: var(--text-2);
		font: 0.875rem var(--font-ui);
	}
	.add:hover {
		color: var(--accent);
	}
</style>
