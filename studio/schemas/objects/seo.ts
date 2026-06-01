import { defineField, defineType } from 'sanity'

// Reusable SEO + AEO object — embed in any document that maps to a public URL.
// Lets clients override the page title / description / OG image AND control
// AI bot visibility per page without touching the design.
//
// Fields are consumed by useSanitySeo() (app/composables/useSanitySeo.js):
//   - title/description/ogImage override the page's hardcoded defaults
//   - aiIndex: false emits <meta name="robots" content="noai, noimageai">
//   - articleSchema: true triggers Article JSON-LD on this page (when wired)
export default defineType({
  name: 'seo',
  type: 'object',
  title: 'SEO',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      description: 'Overrides the default <title>. Leave blank to use the page title.',
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 2,
      validation: (r) => r.max(160),
    }),
    defineField({
      name: 'ogImage',
      type: 'image',
      title: 'Open Graph image',
      description: '1200×630 recommended. Used for social previews and AI engine cards.',
    }),
    defineField({
      name: 'aiIndex',
      type: 'boolean',
      title: 'Allow AI engines to index this page',
      description:
        'Default: true. Set to false to emit `noai, noimageai` robots meta and ask AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.) to skip this page. Useful for proprietary or unreleased content.',
      initialValue: true,
    }),
    defineField({
      name: 'articleSchema',
      type: 'boolean',
      title: 'Emit Article JSON-LD',
      description:
        'Default: false. Set to true on content-heavy pages (case studies, blog posts) so AI engines can extract structured facts (author, datePublished, headline). See .claude/skills/aeo/SKILL.md.',
      initialValue: false,
    }),
  ],
})
