import { defineField, defineType } from 'sanity'
import { orderRankField } from '@sanity/orderable-document-list'

// Work-index project. Minimal by design: name, role, year. The list order
// (and the displayed number) comes from `orderRank` — drag-to-reorder lives
// in the Studio's "Projects" list (see sanity.config.ts). Frontend queries
// with `order(orderRank)` and renders the position as the number.
export default defineType({
  name: 'project',
  type: 'document',
  title: 'Project',
  fields: [
    // Hidden rank field that powers drag-to-reorder in the Studio.
    orderRankField({ type: 'project' }),
    defineField({
      name: 'title',
      type: 'string',
      title: 'Project name',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'role',
      type: 'string',
      title: 'Role',
      options: {
        list: [
          { title: 'Design', value: 'Design' },
          { title: 'Dev', value: 'Dev' },
          { title: 'Design/Dev', value: 'Design/Dev' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'year',
      type: 'number',
      title: 'Year',
      validation: (r) => r.integer().min(1900).max(2100),
    }),
    defineField({
      name: 'url',
      type: 'url',
      title: 'Live site URL',
      description: 'Opens in a new tab from the work list. Leave empty for a non-clickable row.',
      validation: (r) => r.uri({ scheme: ['http', 'https'] }),
    }),
  ],
  preview: {
    select: { title: 'title', role: 'role', year: 'year' },
    prepare: ({ title, role, year }) => ({
      title,
      subtitle: [role, year].filter(Boolean).join(' — '),
    }),
  },
})
