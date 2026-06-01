---
name: canvas-nav
description: How the WebGL canvas survives Nuxt route changes and what gets added/removed from the scene around `<NuxtPage>` swaps. Use when meshes disappear unexpectedly, the canvas vanishes after nav, or transitions leave broken state.
user-invokable: true
---

# Canvas navigation — Nuxt router + persistent canvas

## The pillar

The canvas is a singleton mounted once in [app/app.vue](app/app.vue) (via `<WebGLCanvas />`); the persistent placeholder mesh lives in the scene for the app's lifetime. Pages don't have to do anything to get WebGL during transitions — that's automatic.

When a page genuinely needs an image-driven WebGL plane (opt-in via [useDOMPlane](../dom-plane/SKILL.md)), the composable adds the plane to the scene on mount and removes it on unmount. Those extra meshes join the placeholder in the transition registry temporarily.

## Lifecycle around a route change

```
User clicks <NuxtLink to="/work">
  ↓
Vue Router resolves, pageTransition.onLeave fires
  ↓
  emitter.emit('transition:start')
  usePageTransition().prepareTransition()
    → animates uTransition on every mesh in the registry
    → at minimum the placeholder; plus any per-page DOMPlane meshes
  ↓
<NuxtPage> swaps the page component
  ↓
  OLD page (e.g. index.vue):
    onUnmounted runs
    → IF the page called useDOMPlane: composable disposes mesh,
      unregisters from transition registry
    → IF the page called useWebGLPage: composable removes the page
      handle from the canvas RAF set
    → The placeholder stays — it's owned by the plugin, not by any page
  ↓
  NEW page (e.g. work.vue):
    <script setup> runs
    → IF the page calls useWebGLPage: registers a handle
    → IF the page calls useDOMPlane: schedules texture load +
      mesh creation in onMounted
  ↓
pageTransition.onEnter fires (clip-path reveal + SplitText)
  ↓
  await document.fonts.ready
  await MutationObserver settle (for async heroes)
  usePageTransition().enterTransition(delay)
    → uTransition 1→0 on every registered mesh
  ↓
ScrollTrigger.refresh()
emitter.emit('transition:complete')
```

## Key invariants

- **One persistent canvas.** [layers/webgl/components/WebGLCanvas.vue](layers/webgl/components/WebGLCanvas.vue) mounts ONCE in `app.vue` (outside `<NuxtPage>`). It survives every route swap. The renderer, scene, camera, and `gsap.ticker` callback all live for the app's lifetime.
- **One persistent placeholder mesh.** Created in [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js) inside `mount()`. Lives in `scene.children[0]` for the app's lifetime. The transition system always has at least this one mesh to animate.
- **Per-page meshes are optional and transient.** Only present when a page opts in via `useDOMPlane`. Added on mount, removed on unmount.

## Mesh count expectations

| Scenario                                                 | `scene.children.length`                          |
| -------------------------------------------------------- | ------------------------------------------------ |
| Default state, any page                                  | 1 (placeholder only)                             |
| A page calls `useDOMPlane` once                          | 2 (placeholder + plane)                          |
| A page calls `useDOMPlane` three times                   | 4                                                |
| Mid-transition (overlap window) between two opt-in pages | briefly N + M + 1 — both pages' meshes are alive |
| Mobile / layer disabled                                  | 0 (plugin early-returned, no scene)              |

## Detecting the current page

You usually don't have to. If you do:

```js
// Inside any Vue component
const route = useRoute()
console.log(route.name, route.path, route.params)
```

```js
// Inside the layer (no Vue context)
emitter.on('page:webgl:ready', ({ name }) => { ... })
// emitted by useWebGLPage when a page registers
```

There is no central "active page" registry. The transition mesh registry (in [usePageTransition](../webgl-page/SKILL.md)) is flat — all currently-alive meshes get animated. During the overlap window (Nuxt's `mode: 'default'`) both old and new pages' meshes are briefly registered together — intentional.

## When a page mesh appears after nav but before transition finishes

The new page's `<script setup>` runs synchronously during the `<NuxtPage>` swap. `useDOMPlane()` schedules an async texture load. By the time the texture resolves (~50-150ms), the clip-path reveal is in progress. `enterTransition()` fires at `delay: 0.5-0.65s` — usually AFTER the texture is loaded.

If the texture is slow (large image, slow connection), the mesh appears partway through the reveal. Looks fine because `uOpacity` / `uEntrance` are interpolating anyway.

## Common gotchas

### Mesh from old page lingers after nav

Cause: `useDOMPlane`'s `onUnmounted` didn't fire. Shouldn't happen — Vue always calls `onUnmounted` on a page swap. If it does, suspect:

- Page component wrapped in `<KeepAlive>` (we don't use one)
- A teleport that escaped the page lifecycle

Debug:

```js
console.log(useNuxtApp().$webgl.scene.children.length)
// Expect: 1 (placeholder) + N opt-in DOMPlane meshes of the current page
```

### Mesh appears but at wrong position

Cause: `getBoundingClientRect()` returned 0×0 because the wrapper div wasn't laid out yet at measure time. `useDOMPlane` awaits `nextTick()` before measuring — if that's not enough, the wrapper may have `display: none` initially. Fix: ensure the wrapper is laid out before the page mounts.

### Transition runs but no mesh fade

Cause: `usePageTransition()` called from a context where `useCanvas().enabled === false` (mobile, layer removed). By design. Verify:

```js
console.log(useNuxtApp().$webgl.enabled) // expect: true on desktop
```

### Canvas DOM element disappears

Cause: `<WebGLCanvas />` is inside something that gets unmounted (like a transition wrapper). It MUST be at the `app.vue` level, OUTSIDE `<NuxtPage>`. Otherwise the canvas remounts on every nav and you lose the placeholder + any state.

## SSR boundary

The starter runs `ssr: false`. The plugin file ends in `.client.js` — Nuxt only loads it in the browser. Three.js never sees `undefined window`. If you ever flip to hybrid SSR per-route, ALL WebGL composables need `<ClientOnly>` wrappers OR call sites need to be SSR-safe (the composables already are — they return `{ enabled: false }` when the plugin is absent on the server).

## Key files

- [app/app.vue](app/app.vue) — mounts `<WebGLCanvas />` once
- [layers/webgl/components/WebGLCanvas.vue](layers/webgl/components/WebGLCanvas.vue) — `<canvas>` element + `mount`/`unmount` calls
- [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js) — renderer/scene/camera + RAF + placeholder mesh
- [layers/webgl/composables/useWebGLPage.js](layers/webgl/composables/useWebGLPage.js) — optional per-page handle registration
- [layers/webgl/composables/usePageTransition.js](layers/webgl/composables/usePageTransition.js) — mesh registry + transition hooks
- [layers/webgl/composables/useDOMPlane.js](layers/webgl/composables/useDOMPlane.js) — optional per-page mesh
- [app/transitions/pageTransition.js](app/transitions/pageTransition.js) — calls into the transition hooks

## Cross-references

- [webgl-toggle](../webgl-toggle/SKILL.md) — turn the layer on/off
- [transition](../transition/SKILL.md) — choreography during nav
- [dom-plane](../dom-plane/SKILL.md) — opt-in per-page WebGL planes
