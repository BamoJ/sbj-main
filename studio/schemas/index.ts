// Single source of truth for all schemas registered with the Studio.
// Add a new schema file, import it here, drop it into the array.

import homepage from './documents/homepage'
import project from './documents/project'
import page from './documents/page'
import settings from './documents/settings'

import hero from './sections/hero'
import marquee from './sections/marquee'
import richText from './sections/richText'

import seo from './objects/seo'

export const schemaTypes = [
  // documents
  homepage,
  project,
  page,
  settings,
  // sections (used inside page.sections[])
  hero,
  marquee,
  richText,
  // shared objects
  seo,
]
