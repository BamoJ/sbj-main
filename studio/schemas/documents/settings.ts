import { defineField, defineType } from 'sanity'

// Singleton — one document, site-wide. Holds nav links, footer text,
// default SEO. Studio Structure will need a customization later to
// force it to a single doc (out of scope for the starter).
export default defineType({
  name: 'settings',
  type: 'document',
  title: 'Site Settings',
  fields: [
    defineField({ name: 'siteTitle', type: 'string' }),
    defineField({
      name: 'navLinks',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'label', type: 'string' },
            { name: 'href', type: 'string' },
          ],
        },
      ],
    }),
    defineField({ name: 'footerNote', type: 'string' }),
    defineField({ name: 'defaultSeo', type: 'seo', title: 'Default SEO' }),
  ],
})
