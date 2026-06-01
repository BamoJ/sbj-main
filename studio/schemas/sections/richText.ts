import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'richText',
  type: 'object',
  title: 'Rich Text',
  fields: [
    defineField({
      name: 'body',
      type: 'array',
      of: [{ type: 'block' }],
    }),
  ],
  preview: {
    select: { body: 'body' },
    prepare: ({ body }) => {
      const firstBlock = Array.isArray(body) ? body[0] : null
      const text = firstBlock?.children?.map((c: any) => c.text).join(' ') || ''
      return {
        title: 'Rich Text',
        subtitle: text.slice(0, 80),
      }
    },
  },
})
