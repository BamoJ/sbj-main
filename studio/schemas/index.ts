// Single source of truth for all schemas registered with the Studio.
// Add a schema file, import it here, drop it into the array.

import project from './documents/project'
import settings from './documents/settings'

export const schemaTypes = [project, settings]
