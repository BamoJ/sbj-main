---
name: debug
description: Diagnose issues in the WebGL + Nuxt system. Use when shaders won't compile, the canvas vanishes, transitions break, textures don't load, animations don't fire, or events get dropped.
user-invokable: true
---

# Debug — diagnostic troubleshooting guide

## Quick access from the browser console

```js
const $webgl = useNuxtApp().$webgl
$webgl.enabled                    // false on mobile / when the layer is removed
$webgl.ready.value                // true after WebGLCanvas has mounted
$webgl.renderer.info.render       // draw calls, triangles
$webgl.renderer.info.memory       // geometries, textures count
$webgl.scene.children             // alive meshes (placeholder is always [0] when enabled)
$webgl.scene.children[0].material.uniforms.uTransition.value   // placeholder transition uniform
```

The Vite dev build keeps `console.log`. Production builds (when you ship one) strip console output via the Nuxt 4 default minifier — debug only in `bun dev`.

## Symptom → diagnosis

---

### "Shader won't compile"

**Console shows:** `THREE.WebGLProgram: Shader Error` with line numbers.

**Check:**

1. **GLSL syntax** — missing semicolons, wrong types, undeclared variables.
2. **`#include` lines** — our build doesn't process them (no `vite-plugin-glsl`). Any `#include "..."` line passes through to the GLSL compiler verbatim and will fail. Inline the include's contents directly. See [shader](../shader/SKILL.md).
3. **Uniform mismatch** — JS sets `mesh.material.uniforms.uName.value`; GLSL declares `uniform float uName`. Type mismatch (vec2 in JS, float in GLSL) fails silently or produces visual glitches.
4. **Precision** — fragment shaders need `precision highp float;` (or at least `mediump`). Without it, the shader fails on some devices.
5. **WebGL1 vs WebGL2 syntax** — use `attribute`, `varying`, `texture2D()`, `gl_FragColor`. Avoid `in`/`out`/`texture()` unless you also configure WebGL2.

**Quick fix:** Three.js prints the full processed shader source on compile failure. The first error line is usually the real culprit; later errors cascade. Read `renderer.properties.get(material).programs[0].diagnostics.fragmentShader.log` for the raw GL log.

---

### "Canvas disappeared after route change"

**Cause:** `<WebGLCanvas />` is inside something that unmounts on route change.

**Check:** [app/app.vue](app/app.vue) — `<WebGLCanvas />` must sit at the `<Theme>` level, OUTSIDE `<NuxtPage>`. If it's inside a page or inside the transition wrapper, the canvas remounts every nav and you lose the placeholder + renderer state.

```js
$webgl.ready.value     // should be true and stay true across routes
```

---

### "DOMPlane position is wrong" / planes misaligned

**Check:**

1. **Viewport computed?** In console: `$webgl.viewport` and `$webgl.screen`. Both should be non-zero. If zero, the plugin's `mount()` hasn't run — `<WebGLCanvas />` not rendered.
2. **Camera position** — default `z = 1` with FOV 45. If changed, viewport math breaks (the plugin's `computeViewport()` assumes that camera setup).
3. **`getBoundingClientRect()` timing** — `useDOMPlane` awaits `nextTick()` before measuring. If the wrapper has `display: none` or zero size initially, the rect is 0×0 and the mesh snaps to (0,0).
4. **CSS transforms on parents** — `getBoundingClientRect()` returns transformed coords. A parent with `transform: scale()` offsets the plane. The wrapper div should not be inside a transformed ancestor.
5. **Canvas CSS** — [WebGLCanvas.vue](layers/webgl/components/WebGLCanvas.vue) sets `position: fixed; inset: 0; pointer-events: none; z-index: 0`. Don't override.

**Debug:**

```js
const plane = $webgl.scene.children.find((c) => c !== $webgl.scene.children[0])
const el = document.querySelector('[data-gl-hero]')
console.log('DOM rect:', el?.getBoundingClientRect())
console.log('Plane pos:', plane?.position)
console.log('viewport / screen:', $webgl.viewport, $webgl.screen)
```

---

### "Transition runs but no WebGL pulse"

**Check:**

1. **Mobile bypass active?** `$webgl.enabled` → if `false`, you're on mobile (viewport ≤ 768px). By design.
2. **Layer removed?** Open [nuxt.config.ts](nuxt.config.ts) — is `extends: ['layers/webgl']` present?
3. **`<WebGLCanvas />` in app.vue?** Without it, no canvas mounts → no placeholder mesh → nothing to animate.
4. **Transition hooks called?** [app/transitions/pageTransition.js](app/transitions/pageTransition.js) — `onLeave` should call `usePageTransition().prepareTransition()`; `onEnter` should call `enterTransition(delay)`.
5. **Emitter signals firing?** Listen in console:
   ```js
   const { emitter } = await import('/_nuxt/utils/Emitter.js')
   ;['transition:start', 'transition:complete', 'webgl:tick', 'webgl:ready', 'webgl:resize'].forEach((e) =>
     emitter.on(e, (d) => console.log(e, d))
   )
   ```
6. **Sample the uniform during nav:**
   ```js
   const p = $webgl.scene.children[0]
   const samples = []
   const id = setInterval(() => samples.push(p.material.uniforms.uTransition.value.toFixed(3)), 50)
   useNuxtApp().$router.push('/work')
   setTimeout(() => { clearInterval(id); console.log(samples) }, 2500)
   ```
   Expect a curve 0 → ~1 → 0 over ~1.6s.

---

### "Textures not loading" / black images on a useDOMPlane page

**Check:**

1. **TextureCache** — `textureCache.load(src)` is the only path. Direct `new TextureLoader()` skips dedup but also works; check the promise resolved.
2. **CORS** — cross-origin images need CORS headers. `/images/*` from the same origin is fine. External CDN images need `Access-Control-Allow-Origin`.
3. **Image src** — verify the URL in the network panel returns 200 with `image/*` content-type. NuxtImg may rewrite to `/_ipx/...`; the DOMPlane texture path doesn't go through IPX (you pass the raw URL to `useDOMPlane`).
4. **Texture format** — JPEG, PNG, WebP supported by TextureLoader. AVIF and SVG are not.

**Debug:**

```js
const { textureCache } = await import('/_nuxt/@fs/Users/.../layers/webgl/utils/TextureCache.js')
console.log('Cached:', [...textureCache.cache.keys()])
console.log('Pending:', [...textureCache.pending.keys()])
```

---

### "Scroll animations not firing"

**Check:**

1. **`useAnims()` called?** The page must invoke it in `<script setup>`. Without that, `[data-anim]` elements are inert.
2. **Attribute value matches the registry** — [app/animations/index.js](app/animations/index.js) lists the keys (`fade-in`, `heading`, `paragraph`). Typos like `data-anim="fadein"` won't match.
3. **ScrollTrigger trigger** — by default, the element itself is the trigger. If the element is `display: contents`, ScrollTrigger can't compute its bounds.
4. **Lenis ↔ ScrollTrigger sync** — already wired in [useLenis.js](app/composables/useLenis.js). Don't bypass it.
5. **`triggerStart`** — default is `'top 85%'`. If the element is above the fold, it may have already passed at page load. Set `markers: true` in the animation class to visualise.
6. **Page-pinned cache** — `pageTransition.js` calls `ScrollTrigger.refresh()` at the end of `onEnter` to recompute triggers cached during the pinned phase. If a trigger you created independently isn't refreshing, call `.refresh()` on it manually after the transition completes.

**Debug:**

```js
import { ScrollTrigger } from 'gsap/ScrollTrigger'
ScrollTrigger.getAll().forEach((st) => console.log(st.trigger, st.start, st.end, st.isActive))
```

---

### "Events not received" / Emitter signals dropped

**Check:**

1. **Imports** — two exports from [app/utils/Emitter.js](app/utils/Emitter.js):
   - `import { Emitter } from '~/utils/Emitter'` — the class (extend if you want).
   - `import { emitter } from '~/utils/Emitter'` — the singleton (for cross-system events).
   If you import the class by mistake and try `Emitter.emit(...)`, nothing happens.
2. **Listener attached after emit** — emit-before-listen is a no-op. The Emitter doesn't replay. If you're listening for `'webgl:ready'` and miss it, fall back to `$webgl.ready.value` (true after mount).
3. **Namespace bulk-off** — `emitter.off('event', null, 'namespace')` removes by namespace. If your component cleaned up its namespace, listeners are gone.
4. **Event name typos** — names are strings, no autocomplete safety net.

**Debug:**

```js
// Monkey-patch all emits to log
const orig = emitter.emit.bind(emitter)
emitter.emit = (e, d) => { console.log(`[Emitter] ${e}`, d); return orig(e, d) }
```

---

### "Memory leak" / performance degrades over time

**Check:**

1. **Geometry / material disposal** — every `new PlaneGeometry()` and `new ShaderMaterial()` must have a matching `.dispose()`. `useDOMPlane` handles this in its `onUnmounted` path; raw scene access via `useCanvas()` is on you.
2. **Texture disposal** — `textureCache.clear()` disposes all cached textures. Call only when appropriate (e.g., session reset). Individual texture eviction isn't implemented.
3. **Listener leaks** — components use AbortController; `useDOMPlane` unsubscribes from `webgl:tick` and `webgl:resize` on unmount. If a custom path subscribes without unsubscribing, listeners accumulate.
4. **Orphan GSAP timelines** — `gsap.killTweensOf(target)` clears tweens. Animation classes call `.kill()` in `destroy()`.
5. **ScrollTrigger** — `cleanup: true` self-removes on completion. `cleanup: false` (parallax) persists until you kill it. `useAnims` destroys all its triggers on unmount.
6. **Mesh registry leak** — `usePageTransition`'s mesh registry is a `Set`. `useDOMPlane` removes itself on unmount. If you add meshes directly via `scene.add`, also call `registerTransitionMesh` + `unregisterTransitionMesh` (or skip the registry; meshes added directly don't auto-fade).

**Debug:**

```js
console.log($webgl.renderer.info.memory)   // { geometries, textures }
console.log($webgl.renderer.info.render)   // { calls, triangles, points, lines, frame }
console.log($webgl.scene.children.length)  // expect: 1 (placeholder) + N opt-in planes
```

---

### Performance-specific symptoms

| Symptom | Look at |
|---|---|
| Janky scroll | `getBoundingClientRect` count, ScrollTrigger count, Lenis sync |
| Hover lag | Shader complexity (when bulge lands), lerp ease value, leaked listeners |
| Transition stutter | Overlapping transitions, orphan timelines, blur sample count |
| Slow initial load | Texture sizes, parallel texture loads, font load gating SplitText |

See [perf-audit](../perf-audit/SKILL.md) for a full audit.

## Key files

- [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js) — plugin (renderer/scene/camera/RAF/placeholder)
- [layers/webgl/components/WebGLCanvas.vue](layers/webgl/components/WebGLCanvas.vue) — canvas mount
- [layers/webgl/composables/useCanvas.js](layers/webgl/composables/useCanvas.js) — `$webgl` accessor
- [layers/webgl/composables/useDOMPlane.js](layers/webgl/composables/useDOMPlane.js) — DOM↔plane
- [layers/webgl/composables/usePageTransition.js](layers/webgl/composables/usePageTransition.js) — transition mesh registry
- [layers/webgl/utils/TextureCache.js](layers/webgl/utils/TextureCache.js) — texture loading
- [app/utils/Emitter.js](app/utils/Emitter.js) — events (class + singleton)
- [app/composables/useAnims.js](app/composables/useAnims.js), [app/animations/](app/animations/) — scroll animations
- [app/transitions/pageTransition.js](app/transitions/pageTransition.js) — route choreography
- [nuxt.config.ts](nuxt.config.ts) — `extends`, modules, build config
