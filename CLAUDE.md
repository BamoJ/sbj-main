# CLAUDE.md — bamoj.com

This repo is **bamoj.com** — Bamo.J®'s portfolio, launching as a **one-page placeholder** built on the in-house `sbj-nuxt-starter`. It is no longer used as a generic multi-page starter; the starter's docs live in `.claude/skills/` and have been updated to match this project.

## Stack

Nuxt 4 (**SPA**, `ssr: false`) · Tailwind v4 (`@tailwindcss/vite`) · GSAP + Lenis · optional **WebGL layer** (`layers/webgl`, Three.js) · **Sanity** CMS (`@nuxtjs/sanity` + `studio/`) · Resend (contact) · `@nuxtjs/seo`. Package manager: **bun**.

## Current state

- **Pages:** only `app/pages/index.vue` (a hero). about/work/contact/cms-demo were deleted. `MainNav` navItems is `[]`; sitemap returns just `/`; `public/llms.txt` is single-page.
- **WebGL:** the layer is still `extends`-ed in `nuxt.config.ts`, but `<WebGLCanvas/>` is currently **unmounted** from `app/app.vue` while the hero is reworked — intentional, reintegration is planned. See `.claude/skills/webgl-toggle`.
- **Sanity:** wired to real project `7ysaqk08` (dataset `production`, public). Schema rebuilt from scratch — see below.
- **Hero bg:** `public/images/texture.png` (full-bleed). `bg.svg` also present.

## Sanity (current schema)

Two types only (`studio/schemas/index.ts`):

- **`project`** (`studio/schemas/documents/project.ts`) — the work index. Fields: `title`, `role` (Design/Dev/Design-Dev radio), `year`, `url` (optional, http(s); used to open the live site in a new tab). **Drag-to-reorder** via `@sanity/orderable-document-list` (`orderRankField` in the schema + `orderableDocumentListDeskItem` in `studio/sanity.config.ts`). The on-site number is just list position (`order(orderRank)`), not a stored field.
- **`settings`** (`studio/schemas/documents/settings.ts`) — a **singleton** (fixed `documentId: 'settings'`, no "create new"). Field: `socials` = array of `{ label, url }` (url allows `mailto:` for email). Drag to reorder.

Per-page SEO is `useSanitySeo(slug, defaults)` defaults only — the old Sanity `seo` object was deleted. The starter's section system (`CmsSections`, `Section*`) was also deleted; there are no section types today.

## Run it

```bash
bun install
cd layers/webgl && bun install   # REQUIRED: `three` is in the layer's package.json, not root
cd .. && bun run dev             # frontend → :3000
cd studio && bun run dev         # studio   → :3333
```

## Gotchas (learned wiring this project)

- **`three` lives in `layers/webgl/package.json`** — root `bun install` does NOT fetch it. Run `cd layers/webgl && bun install` or the dev server errors `Unresolvable optimizeDeps: three`.
- **Use `npx sanity`, not `bunx sanity`** — the bun-installed Sanity CLI is broken (missing `term-size` vendor binary) and login won't persist.
- **Browser reads need a CORS origin** — add `http://localhost:3000` (and the prod domain at deploy) under sanity.io/manage → API → CORS Origins, or the frontend's Sanity queries are blocked.
- **Env is read at boot** — after editing `.env` / `studio/.env`, restart the dev server (and the Studio).
- **Don't let Sanity crash app init** — `app/composables/useSanitySeo.js` guards `useSanity()` behind a `projectId` check, and `app/plugins/sanity-prefetch.client.js` wraps its fetch in try/catch. Without these, an unconfigured project or a CORS-blocked fetch produces a 500. Keep them.

## Where to look

`.claude/skills/` documents each subsystem: `sanity`, `seo`, `aeo`, `layout` (Container 12-col grid), `webgl-toggle` + the other `webgl-*`/`shader`/`transition`/`canvas-nav` skills, `component`, `scroll-anim`, `smoothyslider`, `perf-audit`, `debug`. `new-project` captures the clone → trim → wire-Sanity bootstrap path this project followed.
