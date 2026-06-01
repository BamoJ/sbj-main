import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Opt-in WebGL system. The layer ships scene/camera/renderer + DOMPlane
  // composables + shaders + the persistent <canvas>. Remove this single line
  // (plus <WebGLCanvas /> in app.vue and the few useWebGLPage()/useDOMPlane()
  // call sites in pages) to ship a pure GSAP/Lenis/Sanity Nuxt starter.
  extends: ['layers/webgl'],

  // GSAP, Lenis, Three.js/OGL all assume `window` — SPA mode by default.
  // Flip per-route only if a content page genuinely needs SEO indexing.
  ssr: false,

  css: ['~/assets/css/index.css'],

  components: [{ path: '~/components', pathPrefix: false }],

  modules: ['@nuxtjs/sanity', '@nuxt/image', '@nuxtjs/seo'],

  // SEO / AEO single source of truth. NUXT_PUBLIC_SITE_URL is the one knob
  // a real client project flips in .env. Everything downstream (sitemap entries,
  // canonical tags, og:url, schema.org URLs, llms.txt) reads from `site.url`.
  // See .claude/skills/seo/SKILL.md and .claude/skills/aeo/SKILL.md for the
  // switching-to-real-project checklists.
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    name: process.env.NUXT_PUBLIC_SITE_NAME || 'Studio•Bamo.J®',
    description:
      process.env.NUXT_PUBLIC_SITE_DESCRIPTION
      || 'A creative studio building distinctive digital experiences with motion, type, and WebGL.',
    defaultLocale: 'en',
  },

  // Disable heavy submodules. og-image's satori/wasm runtime image gen isn't
  // worth it for an SPA starter — use static OG images per client via Sanity's
  // seo.ogImage field instead. linkChecker is a dev tool. seoExperiments is beta.
  ogImage: { enabled: false },
  linkChecker: { enabled: false },
  seoExperiments: { enabled: false },

  // schema.org defaults — every page inherits this organization graph.
  // Override per page via useSchemaOrg(...) when needed (Article, BreadcrumbList,
  // FAQPage — see the seo skill).
  schemaOrg: {
    identity: {
      type: 'Organization',
      name: process.env.NUXT_PUBLIC_SITE_NAME || 'Studio•Bamo.J®',
      url: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      logo: '/images/og-default.webp',
      sameAs: [
        // Uncomment and set per client project:
        // process.env.NUXT_PUBLIC_INSTAGRAM,
        // process.env.NUXT_PUBLIC_TWITTER,
        // process.env.NUXT_PUBLIC_LINKEDIN,
      ].filter(Boolean),
    },
  },

  // Sitemap entries come from this endpoint. Extend it when dynamic routes
  // (e.g. /work/[slug]) land — pull project slugs from Sanity server-side.
  sitemap: {
    sources: ['/api/__sitemap__/urls'],
    exclude: ['/cms-demo'],
  },

  // robots.txt is module-managed. DO NOT add public/robots.txt — it conflicts.
  //
  // AEO — AI bot directives. Default: allow all. Per-client policy lives here:
  // uncomment a `userAgent` block under `groups` to block that crawler.
  // See .claude/skills/aeo/SKILL.md for the full bot inventory.
  robots: {
    disallow: ['/admin', '/preview'],
    groups: [
      // { userAgent: 'GPTBot', disallow: ['/'] },
      // { userAgent: 'ClaudeBot', disallow: ['/'] },
      // { userAgent: 'PerplexityBot', disallow: ['/'] },
      // { userAgent: 'Google-Extended', disallow: ['/'] },
      // { userAgent: 'Applebot-Extended', disallow: ['/'] },
      // { userAgent: 'Bytespider', disallow: ['/'] },
      // { userAgent: 'Meta-ExternalAgent', disallow: ['/'] },
      // { userAgent: 'Amazonbot', disallow: ['/'] },
      // { userAgent: 'cohere-ai', disallow: ['/'] },
    ],
  },

  // Sanity — projectId pulled from .env so the starter is portable.
  // Each client gets their own cloud project; only env vars change.
  // useCdn: true is the cheap/fast path for public read queries.
  sanity: {
    projectId: process.env.NUXT_PUBLIC_SANITY_PROJECT_ID || '',
    dataset: process.env.NUXT_PUBLIC_SANITY_DATASET || 'production',
    apiVersion: '2025-05-20',
    useCdn: true,
  },

  // Nuxt Image — register the built-in Sanity provider so `<SanityImage>`
  // (which delegates to `<NuxtImg provider="sanity">`) can build CDN URLs
  // with responsive srcset, format negotiation, etc. Without this block,
  // `@nuxtjs/sanity` auto-switches to NuxtImg delegation but NuxtImg has
  // no idea what `provider="sanity"` means → render crash.
  image: {
    sanity: {
      projectId: process.env.NUXT_PUBLIC_SANITY_PROJECT_ID || '',
    },
  },

  // Server-only runtime config — available in server/api/* via useRuntimeConfig().
  // No `public:` prefix means these stay on the server, never bundled to the client.
  runtimeConfig: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    contactToEmail: process.env.CONTACT_TO_EMAIL || '',
  },

  // Global head — site-wide defaults. Per-page meta (title, description,
  // OG image) is set via useSeoMeta() in each page's <script setup>.
  // The titleTemplate adds the studio suffix automatically; pages only
  // need to provide their own slug, e.g. useSeoMeta({ title: 'Home' })
  // resolves to <title>Home — Studio•Bamo.J®</title>.
  app: {
    head: {
      titleTemplate: '%s — Studio•Bamo.J®',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#353233' },
      ],
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
})
