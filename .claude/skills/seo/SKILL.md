---
name: seo
description: SEO scaffolding for the starter — sitemap, robots, JSON-LD, canonical URLs, og meta, all env-driven and Sanity-overridable per page. Includes the exact checklist for switching from the starter's placeholder values to a real client project.
user-invokable: true
---

# SEO — pre-wired scaffolding, fill in domain per project

## What this is

A working SEO scaffold built on **`@nuxtjs/seo`** (meta-module that bundles sitemap, robots, schema-org, and meta-tag helpers). Configured with env-driven `siteUrl` so the starter ships at `localhost:3000` defaults and a real project flips ONE env var to point at the production domain. Per-page SEO can be overridden from Sanity without touching code.

Sister skill: [aeo](../aeo/SKILL.md) — Answer Engine Optimization for AI crawlers (llms.txt, AI bot directives, per-page noai opt-out). Same infrastructure, different audience.

## What ships out of the box

- **Module installed** ([package.json](package.json)): `@nuxtjs/seo` as devDependency.
- **Defaults configured** in [nuxt.config.ts](nuxt.config.ts) `site:` block — name, description, URL, locale.
- **Sitemap** auto-generated, sourced from [server/api/__sitemap__/urls.ts](server/api/__sitemap__/urls.ts). Served at `/sitemap.xml`.
- **Robots.txt** module-managed, served at `/robots.txt`. The `public/robots.txt` file does NOT exist (it would conflict).
- **schema.org Organization** JSON-LD on every page from `nuxt.config.ts` `schemaOrg.identity`.
- **`useSanitySeo(slug, defaults)` composable** ([app/composables/useSanitySeo.js](app/composables/useSanitySeo.js)) wired into every page. Resolves Sanity → defaults.
- **Sanity `seo` object** ([studio/schemas/objects/seo.ts](studio/schemas/objects/seo.ts)) with title, description, ogImage fields ready for per-page CMS overrides.
- **OG image placeholder** at `public/images/og-default.webp` — used as logo in schema.org and as fallback when no per-page ogImage is set.

## `useSanitySeo(slug, defaults)` — the per-page API

```js
// In any page's <script setup>:
useSanitySeo('home', {
  title: 'Home',
  description: 'Default home description for when Sanity has no entry.',
  ogType: 'website',
  // optional:
  // ogImage: '/images/custom-og.jpg',   // static path or absolute URL
  // twitterCard: 'summary_large_image', // default
  // aiIndex: false,                     // emit noai meta — see aeo skill
})
```

Resolution order, **per field**:

1. The Sanity page document's `seo.<field>` (if a Page document with this slug exists in the prefetch cache and the field is populated)
2. The `defaults` object passed in

Emits via `useSeoMeta`: `<title>`, `<meta name="description">`, `<meta property="og:*">`, `<meta name="twitter:*">`, and the canonical link (via the SEO module).

The composable is in [app/composables/useSanitySeo.js](app/composables/useSanitySeo.js); auto-imported everywhere.

## JSON-LD per page (`useSchemaOrg`)

The module ships Organization JSON-LD globally. For richer per-page schema, use `useSchemaOrg([...])` in a page setup.

**Article (content pages, case studies, blog posts):**

```js
useSchemaOrg([
  defineArticle({
    headline: 'Project case study',
    image: '/images/case-study-hero.webp',
    datePublished: '2026-05-23',
    dateModified: '2026-05-23',
    author: { type: 'Person', name: 'Bimo Tri' },
  }),
])
```

**BreadcrumbList (nav trails):**

```js
useSchemaOrg([
  defineBreadcrumb({
    itemListElement: [
      { name: 'Work', item: '/work' },
      { name: 'Project Title', item: '/work/project-slug' },
    ],
  }),
])
```

**FAQPage (Q&A sections):**

```js
useSchemaOrg([
  defineQuestion({
    name: 'What does Studio•Bamo.J® do?',
    acceptedAnswer: 'Design systems, motion, and WebGL experiences for premium-only clients.',
  }),
])
```

`defineArticle`, `defineBreadcrumb`, `defineQuestion`, etc. are auto-imported by the schema-org submodule.

## Sitemap route management

[server/api/__sitemap__/urls.ts](server/api/__sitemap__/urls.ts) is the single source. Returns the array of URLs the sitemap generator includes.

To add **static routes** — edit the array:

```ts
export default defineEventHandler(() => [
  { loc: '/', changefreq: 'weekly', priority: 1.0 },
  { loc: '/about', changefreq: 'monthly', priority: 0.8 },
  { loc: '/your-new-page', changefreq: 'monthly', priority: 0.7 },
])
```

To add **dynamic routes** (e.g. `/work/[slug]` when that lands) — fetch slugs from Sanity server-side and concat:

```ts
import { createClient } from '@sanity/client'
const sanity = createClient({
  projectId: process.env.NUXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NUXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2025-05-20',
  useCdn: true,
})

export default defineEventHandler(async () => {
  const staticUrls = [/* ... */]
  const projects = await sanity.fetch(`*[_type == "project"]{ "slug": slug.current }`)
  const projectUrls = projects.map((p) => ({
    loc: `/work/${p.slug}`,
    changefreq: 'monthly',
    priority: 0.7,
  }))
  return [...staticUrls, ...projectUrls]
})
```

Excluded routes (currently `/cms-demo`) live in [nuxt.config.ts](nuxt.config.ts) under `sitemap.exclude`.

## Robots configuration

Module-managed in [nuxt.config.ts](nuxt.config.ts) `robots:` block. Do **NOT** create `public/robots.txt` — the module's route conflicts with a static file.

```ts
robots: {
  disallow: ['/admin', '/preview'],
  groups: [
    // AI bot blocks — see aeo skill
  ],
},
```

## Switching to a real client project — checklist

Run through these in order when starting a new project with a real domain:

1. **Set the site URL** in `.env`:
   ```
   NUXT_PUBLIC_SITE_URL=https://client-domain.com
   NUXT_PUBLIC_SITE_NAME=Client Studio Name
   NUXT_PUBLIC_SITE_DESCRIPTION=The client's tagline / studio description.
   ```
2. **Replace the OG image** — drop the client's branded 1200×630 image at `public/images/og-default.webp` (or rename to `.png`/`.jpg` and update the `schemaOrg.identity.logo` path in `nuxt.config.ts`).
3. **Set social URLs** — uncomment and populate `NUXT_PUBLIC_INSTAGRAM` / `NUXT_PUBLIC_TWITTER` / `NUXT_PUBLIC_LINKEDIN` in `.env`. They auto-feed into `schemaOrg.identity.sameAs`.
4. **(Optional) Populate Sanity per-page SEO** — in the studio, open each Page document and fill the `seo` object (title, description, ogImage). Those values override the hardcoded defaults in each page file.
5. **Update sitemap routes** — if new static routes were added (or dynamic routes wired), edit [server/api/__sitemap__/urls.ts](server/api/__sitemap__/urls.ts).
6. **Update `/cms-demo` exclusion** — if the demo page is deleted, remove it from `sitemap.exclude` in [nuxt.config.ts](nuxt.config.ts).
7. **Run AEO setup** — see [aeo skill](../aeo/SKILL.md) checklist for `public/llms.txt`, AI bot policy, and per-page AI opt-out.
8. **Verify**:
   ```bash
   bun dev
   # Then in a browser / curl:
   curl http://localhost:3000/sitemap.xml          # XML with all routes
   curl http://localhost:3000/robots.txt           # module-generated
   # View source on `/`:
   #   <title>, <meta name="description">, <meta property="og:*">,
   #   <link rel="canonical">, JSON-LD organization block all present
   ```
   Then run Lighthouse on the deployed URL — SEO score should be ≥ 95.

## When to flip to SSG / prerender

Current state: `ssr: false`. Meta tags appear after JS executes. Google's crawler runs JS so it indexes fine, but **Facebook, Twitter, LinkedIn, Slack, Discord, iMessage preview crawlers don't run JS** — they fetch the initial HTML and parse the static markup. With SPA, they see the empty `<div id="__nuxt"></div>` and the preview card is blank.

**When to flip** — the moment social previews become a real client requirement (almost always for marketing/portfolio sites).

**What changes**:
1. In [nuxt.config.ts](nuxt.config.ts), add a route rules block:
   ```ts
   routeRules: {
     '/': { prerender: true },
     '/about': { prerender: true },
     '/work': { prerender: true },
     '/contact': { prerender: true },
   }
   ```
2. The Sanity prefetch plugin ([app/plugins/sanity-prefetch.client.js](app/plugins/sanity-prefetch.client.js)) currently runs client-only. For SSR/prerender it needs a server-side equivalent — typically a Nitro plugin that fetches the same data and seeds `useState`.
3. WebGL still works post-hydration. The `.client.js` plugin only runs in the browser.

Defer this work until the moment it's actually needed for a client. The scaffold above ships everything else useful in SPA mode.

## Common gotchas

- **Meta tags not in initial HTML** (SPA mode) — by design. Social previews blank until SSG/prerender lands. Google still indexes.
- **`public/robots.txt` would conflict** — the module's runtime route serves `/robots.txt`. Don't create that file. If you ever see a stale `/robots.txt` being served, check `public/` for a leftover file or `_robots.txt` rename.
- **Canonical URLs depend on `site.url`** — if `NUXT_PUBLIC_SITE_URL` is unset, canonicals are `http://localhost:3000/...`. That's why setting the env var is step 1 above.
- **Sanity ogImage requires the asset to be resolvable** — `useSanitySeo` calls `sanity.client.image(asset).url()`. If the asset reference is broken, ogImage falls back to defaults.
- **Title template inheritance** — the `app.head.titleTemplate` in [nuxt.config.ts](nuxt.config.ts) (`%s — Studio•Bamo.J®`) wraps every `useSanitySeo({ title: 'X' })` to `<title>X — Studio•Bamo.J®</title>`. Update the template for a new project.

## Cross-references

- [aeo](../aeo/SKILL.md) — AI crawlers, llms.txt, per-page AI opt-out (sister scaffold)
- [sanity](../sanity/SKILL.md) — the prefetch pipeline + studio schema model
- [new-project](../new-project/SKILL.md) — clone-to-deploy walkthrough; cross-links here for SEO setup

## Key files

- [nuxt.config.ts](nuxt.config.ts) — `site`, `schemaOrg`, `sitemap`, `robots`, disabled submodule blocks
- [app/composables/useSanitySeo.js](app/composables/useSanitySeo.js) — per-page resolver
- [app/composables/usePageData.js](app/composables/usePageData.js) — Sanity prefetch read API used by `useSanitySeo`
- [server/api/__sitemap__/urls.ts](server/api/__sitemap__/urls.ts) — sitemap source
- [studio/schemas/objects/seo.ts](studio/schemas/objects/seo.ts) — Sanity per-page seo object
- [.env.example](.env.example) — required SEO env vars
- [public/images/og-default.webp](public/images/og-default.webp) — placeholder OG image
