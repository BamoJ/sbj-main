import { defineField, defineType } from 'sanity'

// Fixed-field document. The case-study shape stays consistent across
// projects so the design system holds. Adjust fields per client — delete
// this file entirely if a client doesn't need a Project type.
export default defineType({
  name: 'project',
  type: 'document',
  title: 'Project',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'client', type: 'string' }),
    defineField({ name: 'year', type: 'number' }),
    defineField({
      name: 'hero',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'gallery',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
    }),
    defineField({
      name: 'body',
      type: 'array',
      of: [{ type: 'block' }],
      title: 'Body (rich text)',
    }),
    defineField({ name: 'seo', type: 'seo' }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'client', media: 'hero' },
  },
})
