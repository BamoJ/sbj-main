import { defineField, defineType } from 'sanity'

// Singleton — site-wide settings. Currently holds the social links rendered
// in the footer/nav. Drag the array items to reorder them on the site.
export default defineType({
  name: 'settings',
  type: 'document',
  title: 'Site Settings',
  fields: [
    defineField({
      name: 'socials',
      type: 'array',
      title: 'Social links',
      description: 'Drag to reorder. Use a full https:// URL, or mailto:hi@bamoj.com for email.',
      of: [
        {
          type: 'object',
          name: 'socialLink',
          fields: [
            defineField({
              name: 'label',
              type: 'string',
              title: 'Label',
              description: 'e.g. Email, LinkedIn, X/Twitter, Instagram',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'url',
              type: 'url',
              title: 'URL',
              validation: (r) => r.required().uri({ scheme: ['http', 'https', 'mailto'] }),
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'url' } },
        },
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Site Settings' }) },
})
