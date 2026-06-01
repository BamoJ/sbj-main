import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'homepage',
  type: 'document',
  title: 'Homepage',
  fields: [
    defineField({
      name: 'heroEyebrow',
      type: 'string',
      title: 'Hero eyebrow',
      description: 'Small label above the headline (optional).',
    }),
    defineField({
      name: 'heroHeading',
      type: 'string',
      title: 'Hero headline',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'heroImage',
      type: 'image',
      title: 'Hero image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'aboutHeading',
      type: 'string',
      title: 'About section heading',
    }),
    defineField({
      name: 'aboutBody',
      type: 'array',
      title: 'About section body',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'featuredProjects',
      type: 'array',
      title: 'Featured projects',
      description: 'Pick the projects to surface on the homepage. Drag to reorder.',
      of: [{ type: 'reference', to: [{ type: 'project' }] }],
      validation: (r) => r.max(3),
    }),
    defineField({
      name: 'seo',
      type: 'seo',
      title: 'SEO',
    }),
  ],
  preview: {
    select: { title: 'heroHeading' },
    prepare: ({ title }) => ({ title: 'Homepage', subtitle: title || 'Untitled' }),
  },
})
