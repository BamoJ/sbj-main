---
name: sanity
description: How Sanity CMS is wired into this starter — schemas, prefetch plugin, query composables, image rendering, and the section-component map. Use when extending the schema, adding new section types, debugging CMS data flow, or onboarding the studio for a new client.
user-invokable: true
---

# Sanity — CMS integration patterns

## Why prefetch instead of per-page `useAsyncData`

Page transitions need the hero `<h1>` in the DOM at transition time so SplitText can measure characters. Per-page async fetches resolve AFTER the route transition starts → the hero arrives mid-animation → choreography misses its window.

The boot-time plugin ([app/plugins/sanity-prefetch.client.js](app/plugins/sanity-prefetch.client.js)) fixes this by loading ALL `page` documents into `useState('sanity:pages')` at app startup. Pages then read SYNCHRONOUSLY via `usePageData(slug)` — no waterfall.

Trade-off: extra payload on first load. Acceptable for a small-document CMS (a handful of pages per site). If document count grows, migrate the heavy ones to per-route `useAsyncData` and accept the transition timing cost OR refactor the transition to detect async heroes via the existing `MutationObserver` path.

## Two packages, one project

The Sanity Cloud project ID is shared between two npm packages:

| Package | Purpose | Location |
|---|---|---|
| `@nuxtjs/sanity` (frontend) | Query Sanity from Nuxt, render images | dependency in root `package.json` |
| `sanity` (studio) | Authoring UI (run separately) | dependency in `studio/package.json` |

Each has its own `.env` with the same `NUXT_PUBLIC_SANITY_PROJECT_ID` / `SANITY_PROJECT_ID`. Frontend env vars are prefixed `NUXT_PUBLIC_` (exposed to client); studio's are unprefixed (Sanity's CLI reads them).

## Schemas

[studio/schemas/index.ts](studio/schemas/index.ts) registers all schema types:

```
documents/
  homepage.ts    — singleton (sections array)
  page.ts        — collection (slug, title, sections, seo)
  project.ts     — collection (slug, title, images, description, tags, seo)
  settings.ts    — singleton (site title, social, contact, nav?)
sections/
  hero.ts        — { eyebrow, headline, media }
  marquee.ts     — { text, speed }
  richText.ts    — portable text body
objects/
  seo.ts         — reusable { title, description, ogImage, noIndex }
```

Documents come in two flavours:
- **Singletons** (homepage, settings) — exactly one document, used for site-wide config
- **Collections** (page, project) — many documents identified by slug

## Frontend query patterns

### Sync prefetched page (preferred for transition-aware routes)

```ts
const page = usePageData('demo')         // synchronous, returns ref<Page | null>
```

### Per-route async (use when prefetch isn't worth it)

```ts
const route = useRoute()
const { data: project } = await useSanityQuery(
  `*[_type == "project" && slug.current == $slug][0]{
    title,
    "slug": slug.current,
    description,
    images,
    "seo": seo
  }`,
  { slug: route.params.slug }
)
```

### Settings singleton

```ts
const { data: settings } = await useSanityQuery(`*[_type == "settings"][0]`)
```

Cache via `useState` if multiple components read it:

```ts
const settings = useState('sanity:settings', async () =>
  await $sanity.fetch(`*[_type == "settings"][0]`)
)
```

## Section component map

[app/components/Sanity/CmsSections.vue](app/components/Sanity/CmsSections.vue) loops over `page.sections` and maps each `_type` to a Vue component:

```vue
<component :is="resolve(section._type)" :data="section" />
```

To add a new section type:

1. **Studio schema** — create `studio/schemas/sections/<name>.ts`, register it in `index.ts`.
2. **Vue component** — create `app/components/Sanity/Section<Name>.vue`.
3. **Map entry** — add a line in [CmsSections.vue](app/components/Sanity/CmsSections.vue) mapping `_type` → component.
4. Re-deploy studio: `cd studio && bun run deploy`.

## Images

`@nuxtjs/sanity` exposes `<SanityImage :asset-id="..." />` which delegates to `<NuxtImg provider="sanity">`. [nuxt.config.ts:33-37](nuxt.config.ts) registers the Sanity provider for `@nuxt/image` — this is the bridge that makes the Sanity CDN work with NuxtImg's responsive `srcset`.

```vue
<SanityImage
  :asset-id="section.media.asset._ref"
  alt="..."
  sizes="100vw md:50vw"
  class="h-full w-full object-cover"
/>
```

For WebGL textures (where we DON'T want IPX rewriting), use the raw `/images/...` URL or build the Sanity image URL manually:

```ts
const url = useSanity().client.image(section.media).width(1920).url()
useDOMPlane(heroEl, url)
```

## Common gotchas

### Sanity not configured → graceful degradation

The prefetch plugin ([sanity-prefetch.client.js:9-12](app/plugins/sanity-prefetch.client.js)) skips fetching if `projectId` is empty. `usePageData()` returns `null`. New-project setups without a Sanity project yet won't crash.

### `useSanityQuery` types

`@nuxtjs/sanity` doesn't generate types from your schema. For real type safety, install `@sanity/typegen` and run `sanity schema extract && sanity typegen generate types`. Currently we ship without typegen — query results are `any`.

### Draft / preview mode

Not configured. The starter uses `useCdn: true` ([nuxt.config.ts:25](nuxt.config.ts)) → cached public-only data. For draft preview during authoring, switch to `useCdn: false` + add a token-based authenticated client. The Sanity Vision tool (in studio) is the current workaround for previewing.

### Studio CORS

When developing locally and the studio is also on localhost, you may hit a CORS error fetching from the frontend. In Sanity manage console (sanity.io/manage), add `http://localhost:3000` to the project's CORS origins.

## Key files

- [app/plugins/sanity-prefetch.client.js](app/plugins/sanity-prefetch.client.js) — boot-time page hydration
- [app/composables/usePageData.js](app/composables/usePageData.js) — sync accessor
- [app/components/Sanity/CmsSections.vue](app/components/Sanity/CmsSections.vue) — section type → component map
- [app/components/Sanity/SectionHero.vue](app/components/Sanity/SectionHero.vue) — Sanity-driven hero with SanityImage
- [nuxt.config.ts](nuxt.config.ts) — `sanity:` block, `image: { sanity: ... }` provider
- [studio/sanity.config.ts](studio/sanity.config.ts) — studio config, plugins (structure + vision)
- [studio/schemas/](studio/schemas/) — all schema definitions
