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
  { loc: '/', changefreq: 'weekly', priority: 1.0 },
  { loc: '/about', changefreq: 'monthly', priority: 0.8 },
  { loc: '/work', changefreq: 'weekly', priority: 0.9 },
  { loc: '/contact', changefreq: 'monthly', priority: 0.7 },
])
