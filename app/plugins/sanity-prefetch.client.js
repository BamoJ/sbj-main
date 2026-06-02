/**
 * Pre-fetch all Sanity `page` documents at app boot.
 *
 * Why: page transitions need the hero `<h1>` to exist in the DOM at
 * transition time, but per-page `useSanityQuery` resolves AFTER the
 * transition has started — by the time data lands, the choreography has
 * already missed its window (or fired in the wrong order).
 *
 * By loading every page document into Nuxt state once at startup, each
 * route can read from the cache synchronously via `usePageData(slug)`.
 * The hero is in the DOM with real text from the first frame the page
 * mounts — same code path as a static page, transition just works.
 *
 * Cost: one Sanity fetch on cold app load. Subsequent route navigations
 * within the session are instant. Skips entirely when Sanity isn't
 * configured (no projectId env var) so the starter still boots cleanly
 * for new projects that haven't wired Sanity yet.
 */
export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig().public
  if (!config.sanity?.projectId) return

  // A failed fetch here (network, or — common in dev — localhost not yet an
  // allowed CORS origin in the Sanity project) must NOT crash app init.
  // Catch it and fall back to an empty cache so pages render on defaults.
  try {
    const sanity = useSanity()
    const pages = await sanity.fetch(groq`*[_type == "page"]{
      "slug": slug.current,
      title,
      sections,
    }`)
    useState('sanity:pages', () => pages ?? [])
  } catch (err) {
    console.warn('[sanity-prefetch] skipped (Sanity unreachable / CORS):', err?.message || err)
    useState('sanity:pages', () => [])
  }
})
