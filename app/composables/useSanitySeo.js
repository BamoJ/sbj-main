// Per-page SEO + AEO with Sanity overrides + hardcoded defaults.
//
// Usage in a page <script setup>:
//
//   useSanitySeo('home', {
//     title: 'Home',
//     description: 'Default home description for when Sanity has no entry.',
//     ogType: 'website',
//   })
//
// Resolution order (per field):
//   1. Sanity page document's `seo.<field>` (if a Page document with this slug
//      exists in the prefetch cache and the field is populated)
//   2. The `defaults` object passed in
//
// Read once at setup. The Sanity prefetch cache is populated at app boot, so
// data is stable by the time pages run their setup. No reactive overhead needed.
//
// AEO opt-out:
//   Pass `aiIndex: false` in defaults (or set it on the Sanity seo object) to
//   emit `<meta name="robots" content="noai, noimageai">` — tells AI crawlers
//   not to index/train on this page. Default: indexable by AI.

export function useSanitySeo(slug, defaults = {}) {
  const page = usePageData(slug)

  // Sanity's client throws ("Configuration must contain `projectId`") if it's
  // instantiated before a project is wired. Guard on projectId (same check the
  // prefetch plugin uses) so pages still render on their hardcoded defaults
  // before Sanity is configured.
  const projectId = useRuntimeConfig().public.sanity?.projectId
  let sanity = null
  if (projectId && typeof useSanity === 'function') {
    try {
      sanity = useSanity()
    } catch {
      sanity = null
    }
  }

  const cms = page.value?.seo ?? {}

  // Resolve OG image: Sanity asset → CDN URL via the sanity client image helper.
  // Falls back to defaults.ogImage (static path or absolute URL).
  let ogImage = defaults.ogImage
  if (cms.ogImage && sanity?.client?.image) {
    ogImage = sanity.client.image(cms.ogImage).width(1200).height(630).url()
  }

  // AI opt-out — Sanity boolean wins, else default. Default is allow (true).
  const aiAllowed = cms.aiIndex !== false && defaults.aiIndex !== false

  useSeoMeta({
    title: cms.title || defaults.title,
    description: cms.description || defaults.description,
    ogTitle: cms.title || defaults.ogTitle || defaults.title,
    ogDescription: cms.description || defaults.ogDescription || defaults.description,
    ogImage,
    ogType: defaults.ogType || 'website',
    twitterCard: defaults.twitterCard || 'summary_large_image',
    twitterTitle: cms.title || defaults.title,
    twitterDescription: cms.description || defaults.description,
    twitterImage: ogImage,
    // AI opt-out via robots meta. Only emit when blocking; when allowing
    // (the default), let the module-level robots config govern.
    robots: aiAllowed ? undefined : 'noai, noimageai',
  })
}
