import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'hero',
  type: 'object',
  title: 'Hero',
  fields: [
    defineField({ name: 'eyebrow', type: 'string' }),
    defineField({
      name: 'headline',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'media',
      type: 'image',
      options: { hotspot: true },
    }),
  ],
  preview: {
    select: { title: 'headline', subtitle: 'eyebrow', media: 'media' },
    prepare: ({ title, subtitle, media }) => ({
      title: title || 'Hero',
      subtitle: subtitle ? `Hero · ${subtitle}` : 'Hero',
      media,
    }),
  },
})
