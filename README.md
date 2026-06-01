# SBJ Nuxt Starter

> Cloneable Nuxt 4 foundation for Studio•Bämo.J® client builds. Token system, theme cascade, animation registry, page transitions, Sanity wiring, contact pipeline — all conventions, no scaffolding.

## What's here

Token-driven design system (fluid clamps + bundled modifiers + per-token trim), three-theme cascade (`.u-theme-light/dark/brand`), declarative animation registry (`data-anim` + class lifecycle), GSAP-overlap page transitions with hero choreography, Sanity-driven section system with prefetch hydration, and Resend-backed contact form via Nitro. Feature-complete for non-WebGL ports; `useCanvas()` deferred to next iteration.

## Quick start

```bash
bun install
cp .env.example .env   # fill values — see Env vars
bun run dev            # http://localhost:3000
```

`/cms-demo` is the Sanity pipe test surface. `/contact` renders without env, but `/api/contact` returns 500 on submit without `RESEND_API_KEY`.

## Project structure

```
app/
├── app.vue       persistent shell: Theme + MainNav + NuxtPage + GridGuide
├── animations/   Animation base class + REGISTRY + effect/text subclasses
├── assets/css/   tokens, theme cascade, typography, reset (all @layer base)
├── components/
│   ├── GridGuide.vue          Shift+G overlay
│   ├── Global/                MainNav, NavItem, PageNumber
│   ├── Sanity/                CmsSections orchestrator + Hero/Marquee/RichText
│   ├── UI/                    Button, Form, Logo, TextLink, Theme
│   └── Wrapper/Container.vue
├── composables/  useLenis, useAnims, usePageData
├── pages/        index, about, work, contact, cms-demo
├── plugins/      sanity-prefetch.client.js (boot-time CMS hydration)
├── transitions/  pageTransition.js (GSAP overlap + hero choreography)
└── utils/        Emitter, easings, math, media, client-rect
public/images/    static imagery (IPX-optimized)
server/api/       Nitro handlers — contact.post.ts (Resend)
studio/           Sanity Studio — own deps, own .env, schemas/
```

## Stack

| Tool | Version | Notes |
|---|---|---|
| Nuxt | 4.4 | `ssr: false` (SPA) |
| Tailwind CSS | 4.3 | `@tailwindcss/vite` + `@theme` CSS-first |
| Vue | 3.5 | Composition + `<script setup>` |
| GSAP | 3.15 | ScrollTrigger + SplitText (free in v3.13+) |
| Lenis | 1.3 | Smooth scroll singleton via `gsap.ticker` |
| Reka UI | 2.9 | Headless primitives (formerly Radix Vue) |
| @nuxtjs/sanity | 2.3 | CMS client + `<SanityImage>` |
| @nuxt/image | 2.0 | IPX (local) + Sanity (CMS) providers |
| Resend | 6.12 | Email API (server-only) |
| Three.js | 0.184 | Installed; canvas system deferred |

Studio (`studio/`) runs on Sanity 3.65 + React 19 — separate dep tree.

## Env vars

```
NUXT_PUBLIC_SANITY_PROJECT_ID=    # sanity.io/manage → API
NUXT_PUBLIC_SANITY_DATASET=production
RESEND_API_KEY=                   # server-only; no NUXT_PUBLIC_ prefix
CONTACT_TO_EMAIL=                 # destination for form submissions
```

Starter boots **without** Sanity vars (prefetch plugin no-ops). `/cms-demo` shows "Sanity not wired."

**Gotcha:** `.env` lines must start at column 1. A single leading space → silently ignored by env parsing.

## Sanity

Studio lives in `studio/` with its own `package.json`, lockfile, and `.env`. Per-client wiring steps (`sanity init --reconfigure`, schema registration, deploy) are in `SANITY_SETUP.md` (local-only, gitignored).

## Conventions — do NOT reinvent

The starter's value is the conventions. Read [.claude/CLAUDE.md](.claude/CLAUDE.md) §6 before adding tokens / themes / animations / sections / form fields / images. Quick pointers:

- **Type** — edit `--text-X-min` / `--text-X-max` in `tokens.css` `:root`. Two knobs.
- **Theme** — wrap any region with `.u-theme-{light,dark,brand}`. Semantic tokens flow to descendants.
- **Animation** — `data-anim="key"` + class in the `app/animations/` REGISTRY (declarative), OR `gsap.context()` + `onUnmounted` in `<script setup>` (bespoke one-offs).
- **Image** — `public/images/` + `<NuxtImg src="/images/...">` for local. `<SanityImage :asset-id="...">` for CMS. Never `app/assets/img/`.
- **Form / email** — `useRuntimeConfig()` (server-only block in `nuxt.config.ts`), POST to `/api/contact`.
- **CSS layer** — wrap custom resets in `@layer base { ... }`. Unlayered always beats layered (CSS Cascade Level 5).

## Scripts

| Command | What |
|---|---|
| `bun run dev` | Dev server :3000 |
| `bun run build` | Production build |
| `bun run preview` | Serve build locally |
| `bun run generate` | SSG (rarely — `ssr: false`) |

Studio (run from `studio/`): `bun run dev` (:3333), `bun run deploy` (publishes to `*.sanity.studio`).

## Deployment

Vercel. Push to `main`. Set in Vercel env: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `NUXT_PUBLIC_SANITY_PROJECT_ID`, `NUXT_PUBLIC_SANITY_DATASET`, `NUXT_PUBLIC_SITE_URL`, `NUXT_PUBLIC_SITE_NAME`, `NUXT_PUBLIC_SITE_DESCRIPTION`. `ssr: false` → static SPA bundle output.

## Per-client workflow

1. Clone, rename
2. New Sanity cloud project — `cd studio && bunx sanity init --reconfigure`
3. Drop new IDs into both `.env` files (frontend + `studio/`)
4. Brand the tokens — `tokens.css` swatch + type scale + `theme.css` palette
5. SEO/AEO setup — see [`.claude/skills/seo/SKILL.md`](.claude/skills/seo/SKILL.md) and [`.claude/skills/aeo/SKILL.md`](.claude/skills/aeo/SKILL.md). Set `NUXT_PUBLIC_SITE_URL`, swap `public/images/og-default.webp`, edit `public/llms.txt`, decide AI bot policy.
6. Wire content in Studio, push to Vercel

## SEO + AEO

Pre-wired scaffolds. Default state at `localhost:3000` — flip env vars for production. Both have dedicated skills with step-by-step "switching to a real project" checklists:

- **[seo skill](.claude/skills/seo/SKILL.md)** — `@nuxtjs/seo` module wired with sitemap (`/sitemap.xml`), robots (`/robots.txt`), JSON-LD Organization, canonical URLs, og meta. `useSanitySeo(slug, defaults)` composable on every page — Sanity studio overrides hardcoded defaults per-page.
- **[aeo skill](.claude/skills/aeo/SKILL.md)** — `public/llms.txt` ([llmstxt.org](https://llmstxt.org/) spec) for AI engines, AI bot directives in robots config (default: allow), per-page `noai` opt-out via `aiIndex: false`, extended Sanity seo schema with `aiIndex` + `articleSchema` fields.

Single env knob drives everything: `NUXT_PUBLIC_SITE_URL`. The two skill files spell out the rest.

## Roadmap

- **Cross-page WebGL mesh flight** (TransitionController port — playfight's image-flies-from-list-to-detail effect)
- **Raycaster hover + bulge** uniform animation
- **Dynamic routes** — `pages/work/[slug].vue` for Sanity project documents
- **CMS-driven MainNav** (Sanity `settings` singleton instead of hardcoded items)
- Custom Resend `from` address (DNS verify on `studio-bamoj.com` → SPF/DKIM)
- Plausible / Fathom analytics
- Project ESLint config
- SSG/prerender for content pages (when social previews become a real client need)

## References

- [.claude/CLAUDE.md](.claude/CLAUDE.md) — full conventions, sharp edges, changelog. **Frozen at v1.5 (May 2026)** — historical reference, not a maintained spec.
- `SANITY_SETUP.md` — per-client Sanity wiring (gitignored, local-only).
