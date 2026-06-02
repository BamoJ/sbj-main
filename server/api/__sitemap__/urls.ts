// Sitemap source — feeds @nuxtjs/sitemap (configured in nuxt.config.ts via
// `sitemap.sources`). Returns the list of URLs the generator includes.
//
// Currently: the 4 static pages. /cms-demo is excluded via nuxt.config.ts's
// sitemap.exclude — it's a demo route, not real content.
//
// When dynamic routes land (e.g. /work/[slug] backed by Sanity project
// documents), pull the slugs server-side here and concat onto the array.
// Example pattern (uncomment + adapt when /work/[slug] exists):
//
//   import { createClient } from '@sanity/client'
//   const sanity = createClient({
//     projectId: process.env.NUXT_PUBLIC_SANITY_PROJECT_ID,
//     dataset: process.env.NUXT_PUBLIC_SANITY_DATASET,
//     apiVersion: '2025-05-20',
//     useCdn: true,
//   })
//   const projects = await sanity.fetch(`*[_type == "project"]{ "slug": slug.current }`)
//   const projectUrls = projects.map((p) => ({
//     loc: `/work/${p.slug}`,
//     changefreq: 'monthly',
//     priority: 0.7,
//   }))
//   return [...staticUrls, ...projectUrls]

export default defineEventHandler(() => [
  // One-pager placeholder — the homepage is the only route. When real pages
  // (/work/[slug], /about, …) land, add them here (and pull project slugs
  // from Sanity server-side per the example above).
  { loc: '/', changefreq: 'monthly', priority: 1.0 },
])
