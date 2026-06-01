/**
 * Read a Sanity `page` document from the in-memory cache populated by
 * the `sanity-prefetch` plugin. Returns a computed ref that resolves
 * synchronously — no async, no Suspense, no transition timing dance.
 *
 * If the plugin hasn't run (Sanity not configured, env var missing) or
 * no document matches the given slug, the computed resolves to undefined.
 * The calling template should v-if/v-show around that case.
 *
 * Usage:
 *   const page = usePageData('demo')
 *   // page.value.sections, page.value.title, ...
 */
export function usePageData(slug) {
  const cache = useState('sanity:pages')
  return computed(() => cache.value?.find((p) => p.slug === slug))
}
