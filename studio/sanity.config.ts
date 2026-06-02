import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list'
import { schemaTypes } from './schemas'

// Per-client config — projectId/dataset come from the env so the same
// Studio code can serve any client. Drop the values into .env when wiring.
export default defineConfig({
  name: 'default',
  title: 'Studio•Bämo.J®',

  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',

  // "Projects" is a drag-to-reorder list (orderableDocumentListDeskItem) —
  // the order set here drives the work-index numbering on the site.
  // "Site Settings" is a singleton (one fixed doc, no "create new").
  plugins: [
    structureTool({
      structure: (S, context) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Site Settings')
              .id('settings')
              .child(S.document().schemaType('settings').documentId('settings')),
            S.divider(),
            orderableDocumentListDeskItem({
              type: 'project',
              title: 'Projects',
              S,
              context,
            }),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
