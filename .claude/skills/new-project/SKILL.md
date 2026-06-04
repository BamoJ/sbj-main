---
name: new-project
description: Bootstrap a new client project from this Nuxt starter. Use when cloning the starter for a new site, configuring Sanity per-client, scaffolding pages, or deciding whether to keep/remove the WebGL layer.
user-invokable: true
---

# New project — scaffold from sbj-nuxt-starter

## Step 0 — Clone

```bash
gh repo clone bamoj/sbj-nuxt-starter <new-project>
cd <new-project>
rm -rf .git && git init
bun install
```

## Step 1 — Decide: WebGL on or off?

The starter ships with the WebGL layer **enabled** by default.

### Keep WebGL (default — recommended)

The layer is a class-based `Canvas`/`Page` engine — see [webgl-canvas](../webgl-canvas/SKILL.md).
Already wired:
- [nuxt.config.ts](nuxt.config.ts) has `extends: ['layers/webgl']`
- [app/app.vue](app/app.vue) renders `<WebGLCanvas />` + binds `<NuxtPage :transition>`
- `app/transitions/pageTransition.js` `onEnter` calls `$webgl.onChange(route.name, el)` to swap views
- It auto-gates: disabled on touch / reduced-motion, and swaps to a static BG below 768px (see [webgl-toggle](../webgl-toggle/SKILL.md))

The current home view is a temporary particle logo. For a new project, **replace the
view**: add a `Page` subclass under `layers/webgl/canvas/<Name>/` and register it in
`canvas/registry.js` (see [webgl-canvas](../webgl-canvas/SKILL.md) → "Add a view"). For a
DOM-mapped image plane, the *(reference)* [dom-plane](../dom-plane/SKILL.md) shows the
pattern to port.

### Remove WebGL

Full procedure in [webgl-toggle](../webgl-toggle/SKILL.md). Short version:

1. Remove `extends: ['layers/webgl']` from [nuxt.config.ts](nuxt.config.ts).
2. Remove `<WebGLCanvas />` from [app/app.vue](app/app.vue).
3. Remove the `$webgl.onChange(...)` lines from `onEnter` in [app/transitions/pageTransition.js](app/transitions/pageTransition.js) (keep the `emitter.emit` signals).
4. In [app/pages/index.vue](app/pages/index.vue), drop `useWebGL()` and hard-show the static BG (`useWebGL` disappears with the layer).
5. Optionally `rm -rf layers/webgl` + `bun install` to drop `three`.

Result: pure GSAP / Lenis / Sanity Nuxt starter; the static `texture.png` becomes the hero.

## Step 2 — Configure Sanity (per client)

Each client gets their own Sanity Cloud project. Two packages need configuring:

### Frontend ([.env](.env))

```bash
cp .env.example .env
```

Edit `.env`:
```
NUXT_PUBLIC_SANITY_PROJECT_ID=<client-project-id>
NUXT_PUBLIC_SANITY_DATASET=production
RESEND_API_KEY=<resend-key>
CONTACT_TO_EMAIL=<client-inbox>
```

### Studio (`studio/.env`)

```bash
cp studio/.env.example studio/.env   # if exists; otherwise create
```

Same `SANITY_PROJECT_ID` / `SANITY_DATASET` values.

Then:
```bash
cd studio && bun install && bun run dev   # studio on :3333
cd .. && bun dev                          # frontend on :3000
```

### First-time Sanity Cloud setup (if creating a NEW project for the client)

1. `cd studio && bunx sanity init` — creates the project on Sanity Cloud
2. CORS: in Sanity manage console, add `http://localhost:3000` for dev
3. Deploy studio: `bun run deploy` (from `studio/`)

## Step 3 — Update site-wide identity

### Title / meta

[nuxt.config.ts](nuxt.config.ts):
```ts
app: {
  head: {
    titleTemplate: '%s — <Client Name>',
    htmlAttrs: { lang: 'en' },
    meta: [
      { name: 'theme-color', content: '#<brand-color>' },
    ],
  },
},
```

### Brand color tokens

[app/assets/css/theme.css](app/assets/css/theme.css) — update `--color-bg`, `--color-fg`, `--color-line`, `--color-link-fg`, `--color-link-fg-hover` for each theme. The `u-theme-brand` class has the client's brand color.

### Fonts

[app/assets/css/fonts.css](app/assets/css/fonts.css) — replace the Helvetica Neue LT `@font-face` blocks with the client's typography. Drop the woff2 files in [app/assets/fonts/](app/assets/fonts/).

### Logo

[app/components/UI/Logo.vue](app/components/UI/Logo.vue) — swap the SVG for the client's mark.

## Step 4 — Set up pages

### Static pages

For each route the client needs:

```vue
<!-- app/pages/services.vue -->
<script setup>
useSeoMeta({ title: 'Services', description: '...' })
useAnims()
</script>

<template>
  <div>
    <section class="relative h-screen">
      <NuxtImg
        src="/images/services-hero.webp"
        alt="Services hero"
        class="absolute inset-0 h-full w-full object-cover"
      />
      <Container>
        <h1 data-hero-title class="text-display">Services</h1>
        <PageNumber>5</PageNumber>
      </Container>
    </section>
    <!-- content sections -->
  </div>
</template>
```

New pages need **no WebGL code** to render normally. A page only gets a WebGL view if its
route name is registered in `layers/webgl/canvas/registry.js`; the transition's
`$webgl.onChange(route.name)` then swaps to it.

If a page needs its own WebGL, add a `Page` subclass + a registry entry — see
[webgl-canvas](../webgl-canvas/SKILL.md) → "Add a view". For a DOM-mapped image plane, the
*(reference)* [dom-plane](../dom-plane/SKILL.md) shows the pattern to port.

Add the route to [MainNav.vue:4-10](app/components/Global/nav/MainNav.vue)'s hardcoded items, or migrate the nav to CMS-driven via the Sanity `settings` singleton.

### Dynamic pages (project detail, etc.)

The Sanity schema already has a `project` document type ([studio/schemas/documents/project.ts](studio/schemas/documents/project.ts)) — slug + title + images.

To render `/work/<slug>` for each project:

1. Create `app/pages/work/[slug].vue`
2. Use `useSanityQuery` (or extend the prefetch plugin to include projects):
   ```vue
   <script setup>
   const route = useRoute()
   const { data: project } = await useSanityQuery(
     `*[_type == "project" && slug.current == $slug][0]`,
     { slug: route.params.slug }
   )
   useSeoMeta({ title: project.value?.title })
   </script>
   ```

## Step 4.5 — Configure SEO + AEO

The starter ships with the full SEO/AEO scaffold pre-wired (`@nuxtjs/seo` module, sitemap, robots, JSON-LD, `llms.txt`, Sanity-overridable per-page meta). For a real project, the per-project setup is captured in two skills with explicit step-by-step checklists:

- **[seo](../seo/SKILL.md)** — set `NUXT_PUBLIC_SITE_URL` + name + description in `.env`, swap `public/images/og-default.webp` for the client's branded 1200×630 image, optionally populate social URLs, populate Sanity per-page `seo` fields.
- **[aeo](../aeo/SKILL.md)** — edit `public/llms.txt` with client-specific content, decide AI bot policy (allow / search-yes-training-no / block-all) and uncomment the right `robots.groups` blocks in `nuxt.config.ts`, optionally flip `aiIndex: false` on specific pages.

Both checklists are self-contained. Open either skill and execute top-to-bottom.

## Step 5 — Test the contact form

```bash
# 1. Get a Resend API key: https://resend.com (free tier)
# 2. Set RESEND_API_KEY + CONTACT_TO_EMAIL in .env
# 3. bun dev, visit /contact, submit the form
```

Until the client verifies their own domain in Resend, emails are sent from `onboarding@resend.dev` (Resend's shared sender). To use a branded sender:

1. Add the domain in Resend dashboard
2. Configure SPF + DKIM DNS records
3. Update [server/api/contact.post.ts:55](server/api/contact.post.ts) — change `from: 'onboarding@resend.dev'` to `from: '<contact@client-domain>'`

## Step 6 — Deploy

[README.md](README.md) covers Vercel (the recommended target). The starter is SPA mode (`ssr: false`), so any static host works — Cloudflare Pages, Netlify, etc. — but Vercel is simplest with Nuxt 4.

```bash
# Vercel CLI
bunx vercel
# Add env vars in Vercel dashboard:
# - NUXT_PUBLIC_SANITY_PROJECT_ID
# - NUXT_PUBLIC_SANITY_DATASET
# - RESEND_API_KEY
# - CONTACT_TO_EMAIL
```

## Skills you'll want to read next

- [transition](../transition/SKILL.md) — to customise the page transition feel
- [webgl-canvas](../webgl-canvas/SKILL.md) — the WebGL architecture + how to add a view
- [component](../component/SKILL.md) — to build new Vue components
- [sanity](../sanity/SKILL.md) — to extend the CMS schema or queries

## Key files

- [nuxt.config.ts](nuxt.config.ts) — `extends`, modules, Sanity config, runtime env
- [.env.example](.env.example) — required env vars
- [README.md](README.md) — quick start, stack overview, deployment
- [studio/sanity.config.ts](studio/sanity.config.ts) — Studio per-client config
