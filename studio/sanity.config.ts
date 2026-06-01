import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemas'

// Per-client config — projectId/dataset come from the env so the same
// Studio code can serve any client. Drop the values into .env when wiring.
export default defineConfig({
  name: 'default',
  title: 'Studio•Bämo.J®',

  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            // Singletons — one editable instance, no "Create new" button
            S.listItem()
              .title('Homepage')
              .child(S.editor().id('homepage').schemaType('homepage').documentId('homepage')),
            S.listItem()
              .title('Site Settings')
              .child(S.editor().id('settings').schemaType('settings').documentId('settings')),
            S.divider(),
            // Collections — list view + "+ Create new" affordance
            S.documentTypeListItem('page').title('Pages'),
            S.documentTypeListItem('project').title('Projects'),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
