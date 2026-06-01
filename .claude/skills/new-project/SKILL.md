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

Nothing to do. The layer is already wired:
- [nuxt.config.ts](nuxt.config.ts) has `extends: ['layers/webgl']`
- [app/app.vue](app/app.vue) renders `<WebGLCanvas />`
- The placeholder mesh in [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js) renders during route transitions automatically
- Pages have **zero WebGL code by default** — the canvas is alive and reacts to transitions without any opt-in

If a specific page wants image-driven WebGL effects (scroll distortion, RGB shift, motion blur on the hero), opt in via `useDOMPlane` — see [webgl-dom-page](../webgl-dom-page/SKILL.md). That's the exception, not the default.

### Remove WebGL

Full procedure documented in [webgl-toggle](../webgl-toggle/SKILL.md). Short version (4 edits, no per-page changes needed because pages are already bare):

1. Remove `extends: ['layers/webgl']` from [nuxt.config.ts](nuxt.config.ts).
2. Remove `<WebGLCanvas />` from [app/app.vue](app/app.vue).
3. Remove the two `usePageTransition()` calls in [app/transitions/pageTransition.js](app/transitions/pageTransition.js) (one in `onLeave`, one in `onEnter`).
4. Optionally `rm -rf layers/webgl` + `bun install` to drop `three` from `node_modules`.

Result: pure GSAP / Lenis / Sanity Nuxt starter. Transitions still work — they just don't have the WebGL pulse.

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

New pages have **zero WebGL code by default.** The WebGL canvas runs in the background via `<WebGLCanvas />` in app.vue and the placeholder mesh in the plugin — pages don't have to opt in for transitions to feel WebGL-driven.

If a specific page genuinely needs image-driven WebGL (shader effects on the hero, etc.), opt in via `useDOMPlane` — see the [webgl-dom-page](../webgl-dom-page/SKILL.md) skill. That's the exception, not the default.

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
- [webgl-dom-page](../webgl-dom-page/SKILL.md) — to add WebGL meshes to a new page
- [component](../component/SKILL.md) — to build new Vue components
- [sanity](../sanity/SKILL.md) — to extend the CMS schema or queries

## Key files

- [nuxt.config.ts](nuxt.config.ts) — `extends`, modules, Sanity config, runtime env
- [.env.example](.env.example) — required env vars
- [README.md](README.md) — quick start, stack overview, deployment
- [studio/sanity.config.ts](studio/sanity.config.ts) — Studio per-client config
