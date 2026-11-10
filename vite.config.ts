import { mdsvex } from 'mdsvex';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

// '/cms-test' on GitHub Pages (the workflow sets it), '' in dev.
const base = process.env.BASE_PATH ?? '';
if (base && !/^\/[\w-]+$/.test(base)) throw new Error(`BASE_PATH must look like /name: ${base}`);

export default defineConfig({
	plugins: [
		enhancedImages(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// A static site for GitHub Pages. static/admin/ (the CMS) is copied as is.
			adapter: adapter({ fallback: '404.html' }),
			paths: { base: base as `/${string}` | '' },
			// /preview isn't linked from any page, so the crawler wouldn't find it.
			prerender: { entries: ['*', '/preview'] },
			// mdsvex only for .svx: content/*.md is read as text (?raw) and rendered by
			// src/lib/render.ts, the same code the CMS preview uses in the browser.
			preprocess: [mdsvex({ extensions: ['.svx'] })],
			extensions: ['.svelte', '.svx']
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
