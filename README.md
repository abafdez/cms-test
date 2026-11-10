# CMS test

A minimal proof of concept for the portfolio's Phase 11: **Sveltia CMS hosted on GitHub Pages** (sign-in through a Cloudflare Worker) with a **live preview that is the real page**.

## What's here

| Path                            | What it does                                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `content/posts/*.md`            | The content: YAML frontmatter (`title`, `date`) + markdown                                               |
| `src/lib/posts.ts`              | Reads the files at build time                                                                            |
| `src/lib/render.ts`             | Markdown → segments: HTML runs and our blocks (`marked`). Used at build time **and** in the live preview |
| `src/lib/blocks.ts`             | The block registry (` ```yt ` for now): fields, their checks, and the Svelte component for each block    |
| `src/lib/blocks/YouTube.svelte` | The ` ```yt ` block: a link card, no embedded player                                                     |
| `src/lib/Post.svelte`           | A post as the site shows it: HTML runs with `{@html}`, blocks with their component                       |
| `src/app.css`                   | The site's look, which the preview gets for free (it's a page of the site)                               |
| `src/routes/admin/blocks.json/` | The registry's fields as JSON, prerendered next to the CMS, for its editor components                    |
| `src/routes/posts/[slug]/`      | The real post pages (prerendered)                                                                        |
| `src/routes/preview/`           | The live preview page: an empty shell that renders whatever entry the CMS posts to it                    |
| `static/admin/index.html`       | Loads Sveltia CMS (0.262.0, from unpkg) and `preview.js`                                                 |
| `static/admin/config.yml`       | Backend (GitHub + the Worker) and the `posts` collection                                                 |
| `static/admin/preview.js`       | The preview template: an iframe to `/preview`, fed the unsaved entry with `postMessage`                  |
| `.github/workflows/deploy.yml`  | Builds with `BASE_PATH=/<repo>` and deploys to Pages on every push to `main`                             |

### How the live preview works

```text
CMS form ──entry──▶ preview.js ──postMessage──▶ /preview ──▶ Post.svelte + render.ts
                       ▲                            │
                       └──── "cms-preview-ready" ◀──┘   (sent once it has loaded)
```

No server writes anything, so it works the same on GitHub Pages and in dev. The CMS and the site share an origin, and `/preview` ignores messages from any other origin. Compared with the portfolio's dev-only "Real page" tab: this one runs **Svelte components** in the browser, but not build-only steps (mdsvex, enhanced-img, prerender-time data).

### Components in markdown, without mdsvex

````md
```yt
src: https://www.youtube.com/watch?v=gd5uJ7Nlvvo
title: Plain Text, by Dylan Beattie (NDC Copenhagen 2022)
thumbnail: /uploads/plain-text-talk.jpg
caption: Optional.
```
````

`render.ts` cuts the body into runs of markdown (→ HTML) and blocks. `Post.svelte` renders each block with its real Svelte component. Because the same code runs during prerendering and in the browser, the built page and the live preview match, styles included. A block with a mistake in it stops the build with the file's name (`posts.ts`), and in the preview it shows that same message where the block would be.

In the CMS, every block in the registry becomes an editor component, a button in the body's toolbar with a form. `preview.js` reads the fields from `admin/blocks.json`, so adding a block means touching the site only. Thumbnails are uploads (`/uploads/…`); the component adds the base path.

## Run it locally

```sh
pnpm dev
```

Open <http://localhost:5173/admin/index.html> in Chrome or Edge and choose **Work with Local Repository**, then pick this folder (from WSL, choose "Linux" in the picker). No sign-in or Worker is needed. Saves write straight to `content/posts/`.

## Put it on GitHub

1. **Repo:** create `abafdez/cms-test` (if you use another name, change `repo:` in `static/admin/config.yml`), then push to `main`.
2. **Pages:** go to Settings → Pages → Source and choose **GitHub Actions**. The workflow deploys to `https://abafdez.github.io/cms-test/`.
3. **Worker:** deploy [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) to Cloudflare, then copy its URL (`https://sveltia-cms-auth.<subdomain>.workers.dev`). It's one file with no dependencies, `src/index.js`, so you can paste it into the dashboard's editor; there's no need for the Deploy button's build.
4. **GitHub App** (instead of the OAuth App that sveltia-cms-auth's README describes; the worker's sign-in flow is the same for both): create one under Settings → Developer settings → GitHub Apps → New GitHub App.
   - Homepage URL: `https://abafdez.github.io/cms-test/`
   - Callback URL: `<worker URL>/callback`
   - Leave "Request user authorization (OAuth) during installation" unchecked.
   - Webhook: uncheck **Active** (nothing to receive).
   - Repository permissions: **Contents: Read and write** (Metadata: Read-only is added automatically). Nothing else.
   - Where can it be installed: **Only on this account**.
   - After creating it, copy the **Client ID** (`Iv…`, not the App ID) and **generate a client secret**. You don't need a private key: that's for the App acting as itself, and here it acts as you.
   - **Install it** (Install App → Only select repositories → `cms-test`). Its tokens can only reach repos it's installed on.
   - Its tokens expire after 8 hours, and the worker ignores the refresh token, so after 8 hours you'll be asked to sign in again. You could turn expiry off under Optional features, but it's safer to leave it on.
5. **Worker variables:** in Cloudflare, set these and redeploy:
   - `GITHUB_CLIENT_ID` (the App's Client ID)
   - `GITHUB_CLIENT_SECRET` (encrypted)
   - `ALLOWED_DOMAINS=abafdez.github.io`
6. **`base_url`:** put the Worker URL into `static/admin/config.yml`, then push.
7. **Try it:** open `https://abafdez.github.io/cms-test/admin/`, sign in with GitHub, and edit a post (the preview updates as you type). Saving makes a commit, the workflow redeploys, and the post page changes about a minute later.

## Not covered (on purpose)

Images (`public_folder` would need the `/cms-test` base), translations, our custom file format, and editor components. The portfolio already solved those in dev.
