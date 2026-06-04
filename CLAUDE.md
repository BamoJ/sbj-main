# CLAUDE.md — bamoj.com

This repo is **bamoj.com** — Bamo.J®'s portfolio, launching as a **one-page placeholder** built on the in-house `sbj-nuxt-starter`. It is no longer used as a generic multi-page starter; the starter's docs live in `.claude/skills/` and have been updated to match this project.

## Stack

Nuxt 4 (**SPA**, `ssr: false`) · Tailwind v4 (`@tailwindcss/vite`) · GSAP + Lenis · **WebGL layer** (`layers/webgl`, Three.js — class-based `Canvas`/`Page` engine) · **Sanity** CMS (`@nuxtjs/sanity` + `studio/`) · Resend (contact) · `@nuxtjs/seo`. Package manager: **bun**.

## Current state

- **Pages:** only `app/pages/index.vue` (a hero). about/work/contact/cms-demo were deleted. `MainNav` navItems is `[]`; sitemap returns just `/`; `public/llms.txt` is single-page.
- **WebGL:** class-based `Canvas`/`Page` engine in `layers/webgl/canvas/` (ported from the lab), mounted via `<WebGLCanvas/>` in `app/app.vue`. Home hero is a **GPU particle logo** (`canvas/Home/`) on desktop ≥768px; on touch / reduced-motion / <768px it swaps — instantly, on resize — to the static `texture.png` background. See `.claude/skills/webgl-canvas` (architecture) + `webgl-toggle`.
- **Sanity:** wired to real project `7ysaqk08` (dataset `production`, public). Schema rebuilt from scratch — see below.
- **Hero:** desktop = the WebGL particle logo (`public/images/texture-test.png` — a white-on-transparent mark — rasterized into mouse-reactive particles by `canvas/Home/home.js`); the static `public/images/texture.png` is the mobile / no-WebGL fallback. `bg.svg` also present.

## Sanity (current schema)

Two types only (`studio/schemas/index.ts`):

- **`project`** (`studio/schemas/documents/project.ts`) — the work index. Fields: `title`, `role` (Design/Dev/Design-Dev radio), `year`, `url` (optional, http(s); used to open the live site in a new tab). **Drag-to-reorder** via `@sanity/orderable-document-list` (`orderRankField` in the schema + `orderableDocumentListDeskItem` in `studio/sanity.config.ts`). The on-site number is just list position (`order(orderRank)`), not a stored field.
- **`settings`** (`studio/schemas/documents/settings.ts`) — a **singleton** (fixed `documentId: 'settings'`, no "create new"). Field: `socials` = array of `{ label, url }` (url allows `mailto:` for email). Drag to reorder.

Per-page SEO is `useSanitySeo(slug, defaults)` defaults only — the old Sanity `seo` object was deleted. The starter's section system (`CmsSections`, `Section*`) was also deleted; there are no section types today.

## Run it

```bash
bun install                      # root is a bun workspace (`workspaces: ["layers/*"]`) → fetches `three` from the webgl layer too
bun run dev                      # frontend → :3000
cd studio && bun run dev         # studio   → :3333
```

## Gotchas (learned wiring this project)

- **`three` lives in `layers/webgl/package.json`** — root `package.json` declares `workspaces: ["layers/*"]` so a single root `bun install` hoists `three` (and any future layer deps) to root `node_modules`. This is also what makes Vercel work — it only installs at the repo root. Without the workspaces field the build errors `Unresolvable optimizeDeps: three`. The root `bun.lock` MUST contain `three` (Vercel installs with `--frozen-lockfile`); re-run `bun install` and commit the lockfile after touching layer deps.
- **Use `npx sanity`, not `bunx sanity`** — the bun-installed Sanity CLI is broken (missing `term-size` vendor binary) and login won't persist.
- **Browser reads need a CORS origin** — the app is SPA (`ssr: false`), so Sanity queries run in the visitor's browser from the deployed origin. Each origin must be allowlisted under sanity.io/manage → project `7ysaqk08` → API → CORS Origins (no "Allow credentials" — reads are public/token-less), or queries return `403` + `No 'Access-Control-Allow-Origin'`. Currently allowlisted: `http://localhost:3000`, `https://sbj-main.vercel.app`, `https://bamoj.com`, `https://www.bamoj.com`. Per-deploy Vercel preview URLs (`sbj-main-<hash>.vercel.app`) are NOT allowlisted, so CMS data only loads on the stable domains.
- **Env is read at boot** — after editing `.env` / `studio/.env`, restart the dev server (and the Studio).
- **Don't let Sanity crash app init** — `app/composables/useSanitySeo.js` guards `useSanity()` behind a `projectId` check, and `app/plugins/sanity-prefetch.client.js` wraps its fetch in try/catch. Without these, an unconfigured project or a CORS-blocked fetch produces a 500. Keep them.

## Where to look

`.claude/skills/` documents each subsystem: `sanity`, `seo`, `aeo`, `layout` (Container 12-col grid), `component`, `scroll-anim`, `smoothyslider`, `perf-audit`, `debug`, and the WebGL set — **`webgl-canvas`** (the `Canvas`/`Page` architecture + how to add a page view), `canvas-nav`, `transition`, `shader`, `webgl-toggle`. The `dom-plane` / `webgl-dom-page` / `webgl-page` skills are **reference-only** — the DOMPlane image-plane pattern isn't in the current build (kept for a future project). `new-project` captures the clone → trim → wire-Sanity bootstrap path this project followed.
