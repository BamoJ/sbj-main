---
name: debug
description: Diagnose issues in the WebGL + Nuxt system. Use when shaders won't compile, the canvas vanishes, a view won't render or swap, textures don't load, animations don't fire, or events get dropped.
user-invokable: true
---

# Debug — diagnostic troubleshooting

## Quick access from the browser console

```js
const w = useNuxtApp().$webgl
w.enabled           // false on touch / reduced-motion (disabled stub) or layer removed
w.activeRef?.value  // true when particles are active (≥768px); false → static BG showing
w.renderActive      // false when paused below the breakpoint
w.currentPage       // the active Page view (or null if onChange never ran)
w.renderer?.info.render   // draw calls / triangles / points (undefined until mount)
w.renderer?.info.memory   // geometries / textures
w.scene?.children          // alive view Groups (one per visited route, only currentPage visible)
```

`$webgl` is the **Canvas instance** (or a disabled stub on touch / reduced-motion). There's
no `ready`, no placeholder mesh, no `viewport`/`screen` — those were the old composable
system. Debug in `bun dev` (console is stripped in prod).

## Symptom → diagnosis

### "Shader won't compile"
Console: `THREE.WebGLProgram: Shader Error` with line numbers (Three prints the full
processed source; the first error is usually real). Check:
1. GLSL syntax / undeclared vars.
2. `#include` lines — not processed (`?raw`), they reach the compiler verbatim. Inline
   instead. See [shader](../shader/SKILL.md).
3. Uniform mismatch — JS sets `material.uniforms.uName.value`; GLSL type must match.
4. `precision highp float;` declared.
Read `renderer.properties.get(material).programs[0].diagnostics.fragmentShader.log` for the
raw GL log. (The engine runs on WebGL2 — float textures are available for sims.)

### "Canvas disappeared after route change"
`<WebGLCanvas />` must sit at the `<Theme>` level in [app/app.vue](app/app.vue), **outside**
`<NuxtPage>` and any transition wrapper. Inside a swapped subtree, it remounts every nav and
loses the GL context.

### "Nothing renders / canvas is blank"
By far the most common, usually **by design**:
1. `w.enabled === false` → touch / reduced-motion → static BG is correct.
2. `w.activeRef?.value === false` → viewport <768px → paused, BG showing (resize wider to
   confirm it returns).
3. `w.currentPage` is null → `onChange` never ran. Check the route has
   `definePageMeta({ name })` matching a `canvas/registry.js` key, that `pageTransition.js`
   `onEnter` calls `$webgl.onChange(route.name, el)`, and `<NuxtPage :transition>` is bound.
4. Home view specifically: no particles → the source logo image is transparent/missing
   (the rasterizer found no opaque pixels) or failed to load — check
   `/images/texture-test.png` returns 200 and has opaque pixels.

### "View doesn't swap on navigation"
Console shows `[Canvas] No page registered for "<name>"` → the route name isn't a key in
[canvas/registry.js](layers/webgl/canvas/registry.js). Add the view + set the route name.
See [canvas-nav](../canvas-nav/SKILL.md).

### "Textures not loading" (a view that uses textures)
1. **CORS** — same-origin `/images/*` is fine; external CDNs need
   `Access-Control-Allow-Origin`. The image loader sets `crossOrigin = 'anonymous'`.
2. **src** — verify the URL returns 200 with `image/*` in the network panel.
3. `TextureCache` ([layers/webgl/utils/TextureCache.js](layers/webgl/utils/TextureCache.js))
   dedups loads for views that use it. (The Home logo loads via a plain `Image` +
   `getImageData` rasterization, not the cache — a tainted/transparent image yields no
   particles.)

### "Scroll animations not firing"
1. `useAnims()` called in the page `<script setup>`?
2. `[data-anim]` value matches a registry key in [app/animations/index.js](app/animations/index.js).
3. Lenis↔ScrollTrigger sync is wired in [useLenis.js](app/composables/useLenis.js) — don't bypass.
4. `pageTransition.js` calls `ScrollTrigger.refresh()` at the end of `onEnter`; for triggers
   you create independently, `.refresh()` after the transition.
```js
import { ScrollTrigger } from 'gsap/ScrollTrigger'
ScrollTrigger.getAll().forEach(st => console.log(st.trigger, st.start, st.end, st.isActive))
```

### "Events not received" / Emitter dropped
Two exports from [app/utils/Emitter.js](app/utils/Emitter.js): `{ Emitter }` (class) and
`{ emitter }` (singleton). Emit-before-listen is a no-op (no replay). Names are strings —
watch for typos. (Note: the WebGL layer no longer emits `webgl:tick`/`webgl:ready` — the
loop is `gsap.ticker → Time.tick → Canvas.update` internally.)
```js
const orig = emitter.emit.bind(emitter)
emitter.emit = (e, d) => { console.log(`[Emitter] ${e}`, d); return orig(e, d) }
```

### "Memory leak" / degrades over time
1. **Disposal** — `Page.destroy()` traverses `elements` and disposes geometry/materials; a
   view's own `destroy()` disposes extras (e.g. `Home.destroy()` → `Simulation` render
   targets + data textures + color texture); `Canvas.unmount()` disposes the renderer + all
   cached views. Views are cached in `Canvas.pages` until `unmount()`.
2. **Listeners** — components use AbortController; a view that adds window listeners
   (e.g. `Home`'s `mousemove`) must remove them in `onLeave`/`destroy`.
3. **Orphan GSAP timelines** — `gsap.killTweensOf(target)`; animation classes `.kill()` in
   `destroy()`.
```js
console.log(w.renderer?.info.memory, w.renderer?.info.render, w.scene?.children.length)
```

### Performance symptoms → [perf-audit](../perf-audit/SKILL.md)
| Symptom | Look at |
|---|---|
| Janky scroll | ScrollTrigger count, Lenis sync |
| Transition stutter | overlapping transitions, orphan timelines |
| Slow load | source image sizes, particle count (`maxLogoWidth`), font gating SplitText |

## Key files
- [layers/webgl/canvas/index.js](layers/webgl/canvas/index.js) — Canvas (renderer/scene/camera/onChange/update)
- [layers/webgl/components/WebGLCanvas.vue](layers/webgl/components/WebGLCanvas.vue) — canvas mount + active switch
- [layers/webgl/composables/useWebGL.js](layers/webgl/composables/useWebGL.js) — `$webgl` accessor
- [layers/webgl/canvas/registry.js](layers/webgl/canvas/registry.js) — route → view
- [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js) — capability gate + `activeRef`
- [app/utils/Emitter.js](app/utils/Emitter.js) — events (class + singleton)
- [app/transitions/pageTransition.js](app/transitions/pageTransition.js) — route choreography + `onChange`
