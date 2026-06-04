---
name: canvas-nav
description: How the WebGL canvas survives Nuxt route changes and how views are swapped via the registry + Canvas.onChange. Use when the canvas vanishes after nav, a view doesn't swap, or nothing renders after a route change.
user-invokable: true
---

# Canvas navigation — persistent canvas + view swapping

Read [webgl-canvas](../webgl-canvas/SKILL.md) first for the architecture. This skill is
the nav-specific detail: how the canvas persists and how views swap around `<NuxtPage>`.

## The pillar

The canvas is mounted **once** in [app/app.vue](app/app.vue) via `<WebGLCanvas />`,
**outside** `<NuxtPage>`. So the renderer, scene, camera, `Time`, and the `gsap.ticker`
callback live for the whole app — they survive every route change. Pages don't recreate
the engine; they just trigger a **view swap**.

## What swaps a view: `Canvas.onChange(name, data)`

`onChange` is called in two places:
- **Initial load** — `WebGLCanvas.vue` calls `$webgl.onChange(route.name)` the first
  time it builds (there's no page transition on first paint).
- **Navigation** — `app/transitions/pageTransition.js` `onEnter(el)` calls
  `$webgl.onChange(useRoute().name, el)` (the new page's DOM is available there).

```
route is "work"  ──►  $webgl.onChange("work", el)
   registry["work"]  →  lazily `new Work({scene,camera,renderer,time})`  (cached in pages{})
   first visit only:  await view.load()  →  view.create()   (adds view.elements to scene)
   prev.onLeave()     →  hides the old view (elements.visible=false, isActive=false)
   currentPage = next →  next.onEnter(el)  (visible=true, isActive=true, attach listeners)
```

## Key invariants

- **One persistent canvas.** [WebGLCanvas.vue](layers/webgl/components/WebGLCanvas.vue)
  mounts once in `app.vue`, outside `<NuxtPage>`. Renderer/scene/camera/`Time`/ticker
  live for the app's lifetime.
- **Views are cached, not destroyed on leave.** A visited view stays in `Canvas.pages[name]`
  with its `elements` Group still in the scene but **hidden** (`onLeave` sets
  `visible=false`, `isActive=false`). Re-entering the route reuses it. Full disposal only
  happens in `Canvas.unmount()`.
- **Only `currentPage` runs.** `Canvas.update()` calls `currentPage.update(time)` only,
  and only the current view is visible — inactive views are inert hidden Groups.
- **No placeholder mesh.** (The old composable system had one; gone.) An empty scene is
  valid — it just renders nothing.

## Render pause (the responsive switch)

Below the 768px breakpoint (or touch / reduced-motion), `WebGLCanvas` calls
`setRenderActive(false)` and `v-show`-hides the canvas. `Canvas.update()` then
early-returns (no sim, no render) — the loop idles. State is preserved; crossing back
above 768px resumes instantly. See [webgl-toggle](../webgl-toggle/SKILL.md).

## Common gotchas

### Canvas DOM element disappears after nav
`<WebGLCanvas />` must be at the `app.vue` level, **outside** `<NuxtPage>` (and outside any
transition wrapper). If it's inside a swapped subtree it remounts on every nav and the GL
context is lost.

### View doesn't swap on navigation
- The route has no `name`, or the name isn't a key in `canvas/registry.js` → `onChange`
  logs `[Canvas] No page registered for "<name>"` and no-ops. Set
  `definePageMeta({ name: '<key>' })` and add the view to the registry.
- `pageTransition.js` `onEnter` isn't calling `$webgl.onChange(route.name, el)` (check it's
  still there), or `<NuxtPage :transition="pageTransition">` isn't bound in `app.vue`.

### Nothing renders / canvas is blank
- Below the breakpoint or on touch / reduced-motion → WebGL is paused/disabled by design
  (the static BG shows instead). Check `useNuxtApp().$webgl.activeRef?.value` (true =
  particles) and `$webgl.enabled` (false on touch).
- `currentPage` is null → `onChange` was never called or the registry lookup failed.
  `console.log(useNuxtApp().$webgl.currentPage)`.

### Inspecting scene state
```js
const w = useNuxtApp().$webgl
console.log(w.currentPage, w.scene.children.length, w.renderActive, w.activeRef?.value)
```

## SSR boundary

`ssr: false` + the plugin is `webgl.client.js` (browser-only), so Three.js never sees an
undefined `window`. `useWebGL()` returns a disabled stub when the plugin didn't build the
Canvas (touch / reduced-motion), so call sites never throw.

## Key files

- [app/app.vue](app/app.vue) — mounts `<WebGLCanvas />` once, binds `:transition`
- [layers/webgl/components/WebGLCanvas.vue](layers/webgl/components/WebGLCanvas.vue) — container, lazy build, `v-show`, pause/resume
- [layers/webgl/canvas/index.js](layers/webgl/canvas/index.js) — `onChange` / `mount` / `update` / `setRenderActive`
- [layers/webgl/canvas/registry.js](layers/webgl/canvas/registry.js) — route name → view class
- [layers/webgl/canvas/Page.js](layers/webgl/canvas/Page.js) — view lifecycle (`onEnter`/`onLeave`)
- [app/transitions/pageTransition.js](app/transitions/pageTransition.js) — `onEnter` → `$webgl.onChange`

## Cross-references
- [webgl-canvas](../webgl-canvas/SKILL.md) — the architecture
- [transition](../transition/SKILL.md) — choreography during nav + planned plane flight
- [webgl-toggle](../webgl-toggle/SKILL.md) — enable/disable + the responsive switch
