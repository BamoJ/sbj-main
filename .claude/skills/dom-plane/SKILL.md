---
name: dom-plane
description: Map a DOM element to a WebGL plane via the `useDOMPlane()` composable. OPTIONAL helper — the default WebGL (placeholder mesh in the plugin) doesn't need this. Use only when a specific page wants image-driven WebGL effects (scroll distortion, RGB shift, motion blur, hover bulge).
user-invokable: true
---

# DOMPlane — opt-in DOM-to-WebGL plane mapping

## When you need this

Default WebGL is already alive on every page (the placeholder mesh created in [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js)). It reacts to route changes via the transition hooks. You **don't need `useDOMPlane` for transitions to feel WebGL-driven** — that's free.

Use `useDOMPlane` when a specific page wants a **DOM image promoted to a WebGL plane** so shader effects (scroll distortion, RGB shift, motion blur, hover bulge, paper-flutter entrance) apply to it.

## Composable, not a class

Playfight had `class YourView extends DOMPlane`. The Nuxt version is a composable — call it from `<script setup>`:

```vue
<script setup>
useWebGLPage('work')                         // optional registration with canvas RAF
const heroEl = ref(null)
useDOMPlane(heroEl, '/images/work-hero.webp', {
  uniforms: { rgbShift: 1.5, blur: 1, bulge: 0 },
})
</script>

<template>
  <section class="relative h-screen">
    <div ref="heroEl" data-gl-hero class="absolute inset-0">
      <NuxtImg src="/images/work-hero.webp" class="h-full w-full object-cover" />
    </div>
    <Container>
      <h1 data-hero-title>Work</h1>
    </Container>
  </section>
</template>
```

The composable handles everything: texture load, geometry sizing, position sync, cover-fit UV, transition registration, cleanup.

## Why a wrapper div (not `ref` on `<NuxtImg>`)

`<NuxtImg>` is a renderless Vue wrapper around `<img>`. A `ref` on it gives the component instance, not the DOM element. The wrapper div gives a stable `HTMLDivElement` to measure. Same rect, no ambiguity. Inside the wrapper, the `<NuxtImg>` serves as the layer-off / mobile fallback — same markup works in both modes.

## Source files

- [layers/webgl/composables/useDOMPlane.js](layers/webgl/composables/useDOMPlane.js) — the composable
- [layers/webgl/shaders/sharedVert.glsl](layers/webgl/shaders/sharedVert.glsl), [sharedFrag.glsl](layers/webgl/shaders/sharedFrag.glsl) — the shaders the plane uses
- [layers/webgl/utils/TextureCache.js](layers/webgl/utils/TextureCache.js) — URL-keyed dedup loader (used internally; you don't call it directly)
- [layers/webgl/composables/usePageTransition.js](layers/webgl/composables/usePageTransition.js) — the transition mesh registry the plane auto-registers with

## Pixel → world coordinate math

Ported verbatim from playfight. Lives inside `useDOMPlane`'s `syncPosition()`. Given the DOM rect and the plugin's `viewport` (in world units) + `screen` (in pixels):

```
worldX = ((left + width/2) / screenWidth) * viewportWidth - viewportWidth/2
worldY = viewportHeight/2 - ((top + height/2) / screenHeight) * viewportHeight
planeWidth  = (width / screenWidth) * viewportWidth
planeHeight = (height / screenHeight) * viewportHeight
```

The plugin computes `viewport` from the camera's FOV at z=1 (see `computeViewport()` in webgl.client.js). You don't have to.

## Cover-fit UV

When the texture's aspect ratio doesn't match the DOM rect's aspect, the shader needs to crop instead of stretch (CSS `object-fit: cover` semantics). The composable computes `uCoverScale` from `texture.image.naturalWidth/Height` vs the rect:

```js
const imgAspect   = texture.image.naturalWidth / texture.image.naturalHeight
const planeAspect = bounds.width / bounds.height
const coverScale  = new Vector2(1, 1)
if (imgAspect > planeAspect) coverScale.x = planeAspect / imgAspect
else                          coverScale.y = imgAspect / planeAspect
```

The fragment shader applies it: `vec2 coverUv = (vUv - 0.5) * uCoverScale + 0.5;`. Nothing for you to wire — just pick a texture and the cover behaviour is automatic.

## Per-page uniform tuning

The shared shader pair exposes multipliers each page can tune for its own personality without forking shaders:

| Option key | Shader uniform | Effect |
|---|---|---|
| `rgbShift` | `uRGBMul` | RGB channel offset on scroll (0 = off, 1 = default, 2 = punchy) |
| `blur` | `uBlurMul` | Motion blur strength on scroll |
| `bulge` | `uBulgeMul` | Hover bulge intensity (0 = off; raycaster hover not yet wired) |
| `bulgeStrength` | `uBulgeStrengthMul` | Bulge curve shape |

```js
// Quiet, editorial — home
useDOMPlane(heroEl, src, { uniforms: { rgbShift: 0.5, blur: 0.6 } })

// Punchy — work
useDOMPlane(heroEl, src, { uniforms: { rgbShift: 2, blur: 1.5 } })

// Static, no scroll distortion — about
useDOMPlane(heroEl, src, { uniforms: { rgbShift: 0, blur: 0 } })
```

## Transition integration (automatic)

`useDOMPlane` registers each mesh with the transition mesh registry on mount. [usePageTransition](layers/webgl/composables/usePageTransition.js) iterates that registry during route changes and animates `uOpacity` / `uPageTransition` / `uEntrance` / `uTransition` accordingly. **You don't wire transitions per page** — registration is automatic.

## Layer-off / mobile fallback

When `useCanvas().enabled === false` (mobile bypass or `extends: ['layers/webgl']` removed), `useDOMPlane` returns `{ mesh: null, isReady: false }` immediately and never hides the wrapper. The `<NuxtImg>` inside the wrapper renders normally. Same markup serves both modes — no `if (webgl)` branches in your page.

## Per-frame work

The composable subscribes to the layer's `webgl:tick` event and syncs the plane's position every frame:

- One `getBoundingClientRect()` per plane per frame (cheap; main cost)
- One `position.set()` per plane per frame
- `uTime` uniform increment

For one plane per page this is ~free. For 50+ planes consider caching rects and only updating on scroll events.

## Resize

The composable also subscribes to `webgl:resize` (debounced 150ms in the plugin) and rebuilds geometry to match the new viewport. You don't call resize manually.

## Cleanup

On `onUnmounted`:
- Unregisters from the transition registry
- Disposes geometry + material
- Removes the mesh from the scene
- Restores the wrapper's `visibility` (so the DOM image shows if the page re-renders)
- Unsubscribes from `webgl:tick` and `webgl:resize`

AbortController-free — Vue's lifecycle hooks handle teardown. No leaks.

## 60fps rules

1. **One plane per hero is the sweet spot.** Multiple `useDOMPlane()` calls per page work but each one re-reads its rect every frame. Profile beyond ~20 planes.
2. **Geometry segments default to 24×24.** Sharedfrag uses these for vertex deformation (`uStrength` Z-wave, page-transition ripple). Don't drop below 16×16 unless you remove the vertex-deform shader code.
3. **Texture cache is the only loader.** The composable uses `textureCache.load(url)` internally; calling `new TextureLoader()` directly would skip the dedup.
4. **Hide source via `visibility: hidden`, not `display: none`.** `display: none` removes the element from layout → `getBoundingClientRect()` returns zeros → plane snaps to (0,0). The composable does this for you when `hideSource !== false`.
5. **Reduced-motion** — not automatic. Check `prefersReducedMotion()` from [app/utils/media.js](app/utils/media.js) in your page if you want to disable the plane for users who prefer it.

## When NOT to use `useDOMPlane`

- **You just want WebGL alive during transitions** — already free via the placeholder. Don't call this.
- **Particles / instanced meshes / 3D models** — bypass `useDOMPlane` entirely. Use `useCanvas()` directly:

  ```js
  const { scene, camera, time } = useCanvas()
  const particles = new Points(...)
  scene.add(particles)
  onUnmounted(() => {
    scene.remove(particles)
    particles.geometry.dispose()
    particles.material.dispose()
  })
  ```

- **Cross-page mesh flight** (image flies from list to detail) — needs `TransitionController` port, not yet wired.
- **Hover bulge** (mouse hover distortion) — needs raycaster + per-frame `uMouse` update, not yet wired (the shader uniforms exist; the input plumbing doesn't).

## Cross-references

- [webgl-toggle](../webgl-toggle/SKILL.md) — turn the whole WebGL layer on/off
- [webgl-page](../webgl-page/SKILL.md) — `useWebGLPage()` for per-page RAF hooks
- [webgl-dom-page](../webgl-dom-page/SKILL.md) — end-to-end pattern for an image-driven page
- [transition](../transition/SKILL.md) — how the transition hooks drive your plane's uniforms
- [shader](../shader/SKILL.md) — GLSL uniform reference for `sharedVert.glsl` / `sharedFrag.glsl`
