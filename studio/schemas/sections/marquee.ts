import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'marquee',
  type: 'object',
  title: 'Marquee',
  fields: [
    defineField({
      name: 'items',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (r) => r.min(1),
    }),
    defineField({
      name: 'speed',
      type: 'number',
      initialValue: 1,
      validation: (r) => r.min(0.1).max(5),
    }),
  ],
  preview: {
    select: { items: 'items' },
    prepare: ({ items }) => ({
      title: 'Marquee',
      subtitle: Array.isArray(items) ? items.join(' · ') : '',
    }),
  },
})
