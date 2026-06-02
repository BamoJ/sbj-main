---
name: component
description: Build DOM components as Nuxt-auto-imported Vue SFCs. Use when adding cursor followers, theme toggles, menus, modals, custom buttons, or any DOM-only interactive element.
user-invokable: true
---

# Component — Vue SFC pattern for this starter

## The pattern

Nuxt's auto-imports replace that whole layer — drop a `.vue` file in `app/components/`, use the component name in any template, done. Lifecycle hooks (`onMounted` / `onUnmounted`) handle event listeners and cleanup.

## Folder organisation

```
app/components/
  Global/        — site-wide chrome (MainNav, PageNumber)
    nav/
      MainNav.vue
      NavItem.vue
    pagenumber/
      PageNumber.vue
  Sanity/        — CMS section renderers
    CmsSections.vue
    SectionHero.vue
    SectionMarquee.vue
    SectionRichText.vue
  UI/            — reusable design-system primitives
    buttons/Button.vue
    form/Form.vue
    links/TextLink.vue
    Logo.vue
    Theme.vue
  Wrapper/       — layout primitives
    Container.vue  — margin-based grid container; see the `layout` skill
  GridGuide.vue  — dev tools (Shift+G overlay)
```

`WebGLCanvas.vue` lives in `layers/webgl/components/` — it ships with the WebGL layer when `extends: ['layers/webgl']` is set, not as a root component.

[nuxt.config.ts](nuxt.config.ts) sets `components: [{ path: '~/components', pathPrefix: false }]` — the folder names DON'T prefix the component name. `app/components/UI/buttons/Button.vue` is just `<Button />`.

## Lifecycle template

```vue
<script setup>
import { isMobile, prefersReducedMotion } from '~/utils/media'

const props = defineProps({
  variant: { type: String, default: 'primary' },
})

const emit = defineEmits(['click'])

const rootEl = ref(null)
const isOpen = ref(false)

// Side effects on mount
let abort = null
onMounted(() => {
  abort = new AbortController()
  // Skip heavy interactions on touch / reduced-motion
  if (isMobile() || prefersReducedMotion()) return

  rootEl.value?.addEventListener('mouseenter', handleEnter, { signal: abort.signal })
})

onUnmounted(() => {
  abort?.abort()
})

function handleEnter(e) {
  // ...
}
</script>

<template>
  <div ref="rootEl" class="...">
    <slot />
  </div>
</template>

<style scoped>
/* Component-scoped CSS via Vue's scoped attribute. Use `:deep()` to reach
   children rendered by SplitText or other runtime DOM. */
</style>
```

## Touch / reduced-motion guards

Pull from [app/utils/media.js](app/utils/media.js):

- `isMobile()` — UA + viewport width (`<= 768px`)
- `isTabletOrBelow()` — `<= 1024px`
- `prefersReducedMotion()` — OS-level media query

Components with hover effects or heavy animations should early-return in their mount handlers when these are true. Don't render different markup — render the same component, just skip the JS.

## Event cleanup with AbortController

Idiom: one `AbortController` per component, pass its `.signal` to every `addEventListener`. `onUnmounted` calls `.abort()`, every listener detaches in one call. Beats tracking each listener manually.

```js
abort = new AbortController()
window.addEventListener('scroll', onScroll, { signal: abort.signal })
window.addEventListener('resize', onResize, { signal: abort.signal })
document.addEventListener('keydown', onKey, { signal: abort.signal })

onUnmounted(() => abort?.abort()) // 3 listeners detached
```

## Listening to cross-system signals

Use the existing `emitter` ([app/utils/Emitter.js](app/utils/Emitter.js)) for transition/scroll signals:

```js
import { emitter } from '~/utils/Emitter'

const onTransitionStart = ({ direction }) => { ... }

onMounted(() => emitter.on('transition:start', onTransitionStart, 'MyComponent'))
onUnmounted(() => emitter.off('transition:start', null, 'MyComponent'))
// Namespace 'MyComponent' lets us bulk-remove all listeners with one off() call.
```

Available signals:

- `transition:start` — fired by `pageTransition.js` onLeave
- `transition:complete` — fired after ScrollTrigger.refresh
- `scroll:update` — `{ scroll, velocity }` on every Lenis tick (high frequency — throttle if needed)
- `webgl:tick` — per-frame from the WebGL plugin (only when layer enabled)
- `webgl:ready`, `webgl:resize`, `page:webgl:ready`, `page:webgl:destroy`

## Animations

For component-internal animations, use GSAP directly:

```js
import gsap from 'gsap'

let tl = null
onMounted(() => {
  tl = gsap.timeline()
  tl.fromTo(rootEl.value, { opacity: 0 }, { opacity: 1, duration: 0.4 })
})
onUnmounted(() => tl?.kill())
```

For scroll-reveal animations on text/blocks, the existing `useAnims()` + `[data-anim="fade-in" | "heading" | "paragraph"]` pattern is already there ([app/composables/useAnims.js](app/composables/useAnims.js), [app/animations/](app/animations/)).

## Auto-imports vs explicit imports

| Where it lives                                                        | Import?                           |
| --------------------------------------------------------------------- | --------------------------------- |
| Vue / Nuxt internals (`ref`, `onMounted`, `useNuxtApp`, `navigateTo`) | Auto                              |
| `app/components/**`                                                   | Auto, by name                     |
| `app/composables/**`                                                  | Auto, by name                     |
| `app/utils/**` named exports                                          | Auto                              |
| `gsap`, `three`, `lenis`, npm packages                                | Explicit import                   |
| `~/utils/Emitter`'s `emitter` singleton                               | Auto (named export auto-imported) |
| Layer composables (`useCanvas`, `useDOMPlane`, etc.)                  | Auto when layer extended          |

## Reka UI primitives

[Reka UI](https://reka-ui.com) is installed and used in [Form.vue](app/components/UI/form/Form.vue). For headless dialog/dropdown/popover/select primitives, prefer Reka over rolling your own — its API is Vue-idiomatic and accessibility is built in.

## Key files

- [nuxt.config.ts](nuxt.config.ts) — `components: [{ path: '~/components', pathPrefix: false }]`
- [app/components/UI/buttons/Button.vue](app/components/UI/buttons/Button.vue) — reference component (multi-variant, NuxtLink/anchor/button, hover effect)
- [app/components/UI/form/Form.vue](app/components/UI/form/Form.vue) — Reka UI usage
- [app/utils/Emitter.js](app/utils/Emitter.js) — singleton + class, documented in source
- [app/utils/media.js](app/utils/media.js) — touch / reduced-motion guards
