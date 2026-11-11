import { describe, expect, it } from 'vitest';
import { count, moveBlock, replaceBlocks } from './body.ts';

const yt = '```yt\nsrc: https://youtu.be/gd5uJ7Nlvvo\ntitle: x\n```';
const body = `# Title\n\nOne **bold**.\n\n- a\n- b\n\n${yt}\n\nLast.\n`;

describe('replaceBlocks', () => {
	it('rewrites one block and leaves the rest as written', () => {
		expect(replaceBlocks(body, 1, 1, 'One _edited_.')).toBe(
			`# Title\n\nOne _edited_.\n\n- a\n- b\n\n${yt}\n\nLast.\n`
		);
	});

	it('keeps a blank line after a list it rewrites (its markdown ends in a newline)', () => {
		expect(replaceBlocks(body, 2, 1, '- a\n- b\n- c')).toBe(
			`# Title\n\nOne **bold**.\n\n- a\n- b\n- c\n\n${yt}\n\nLast.\n`
		);
	});

	it('turns one block into several, and back', () => {
		const split = replaceBlocks(body, 1, 1, 'One\n\nTwo');
		expect(split).toBe(`# Title\n\nOne\n\nTwo\n\n- a\n- b\n\n${yt}\n\nLast.\n`);
		expect(replaceBlocks(split, 1, 2, 'One **bold**.')).toBe(body);
	});

	it('removes a block with its blank lines', () => {
		expect(replaceBlocks(body, 1, 1, '')).toBe(`# Title\n\n- a\n- b\n\n${yt}\n\nLast.\n`);
		expect(replaceBlocks(body, 4, 1, '')).toBe(`# Title\n\nOne **bold**.\n\n- a\n- b\n\n${yt}\n`);
		expect(replaceBlocks('Only', 0, 1, '')).toBe('');
	});

	it('inserts before a block, at the end, and into an empty body', () => {
		expect(replaceBlocks(body, 0, 0, 'New')).toBe(`New\n\n${body}`);
		expect(replaceBlocks(body, 5, 0, 'New')).toBe(`${body}\nNew\n`);
		expect(replaceBlocks('', 0, 0, 'New')).toBe('New');
		expect(replaceBlocks(body, 2, 0, '')).toBe(body);
	});

	it('refuses blocks that are not there', () => {
		expect(() => replaceBlocks(body, 5, 1, 'x')).toThrow(RangeError);
	});
});

describe('moveBlock', () => {
	it('moves a block up, down, to the ends', () => {
		expect(moveBlock(body, 4, 0)).toBe(`Last.\n\n# Title\n\nOne **bold**.\n\n- a\n- b\n\n${yt}\n`);
		expect(moveBlock(body, 0, 1)).toBe(`One **bold**.\n\n# Title\n\n- a\n- b\n\n${yt}\n\nLast.\n`);
		expect(moveBlock(body, 3, 4)).toBe(`# Title\n\nOne **bold**.\n\n- a\n- b\n\nLast.\n\n${yt}\n`);
		expect(moveBlock(body, 2, 2)).toBe(body);
	});
});

describe('count', () => {
	it('counts blocks', () => {
		expect([count(''), count('One'), count('One\n\nTwo'), count('- a\n- b')]).toEqual([0, 1, 2, 1]);
	});
});
