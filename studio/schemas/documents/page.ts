import { defineField, defineType } from 'sanity'

// Slice-based document. The client composes pages by adding section
// blocks in any order. Add a new section type → register it in
// schemas/index.ts → add it to `sections.of[]` below → map it in
// the frontend SanitySections component.
export default defineType({
  name: 'page',
  type: 'document',
  title: 'Page',
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
    defineField({
      name: 'sections',
      type: 'array',
      of: [{ type: 'hero' }, { type: 'marquee' }, { type: 'richText' }],
    }),
    defineField({ name: 'seo', type: 'seo' }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'slug.current' },
  },
})
