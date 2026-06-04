import { Home } from './Home/home'

// Route name → page view. Adding a page later is one import + one line here
// (and a view file under canvas/<Name>/). The engine and other pages are
// untouched. Keys must match the Nuxt route name (see definePageMeta in the
// corresponding app/pages/*.vue).
export const registry = {
  home: Home,
}
