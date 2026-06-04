---
name: webgl-dom-page
description: "(reference / future — not in the current build) Pattern for mapping a DOM image to a WebGL plane on a specific page. Overlaps with dom-plane; both document the removed useDOMPlane pattern, kept for a future project."
user-invokable: true
---

> ⚠️ **Reference pattern — NOT in the current build.** Documents the removed
> `useDOMPlane` image-plane pattern (gone since the WebGL layer went class-based — see
> [webgl-canvas](../webgl-canvas/SKILL.md)). Kept for a **future project**; overlaps with
> [dom-plane](../dom-plane/SKILL.md) (the canonical reference). Nothing below matches today's code.

# WebGL DOM Page — optional pattern for image-driven WebGL  *(reference)*

## When you need this

Default WebGL (the placeholder mesh in the plugin) is already alive on every page and reacts to transitions. You don't need `useDOMPlane` for "WebGL during transitions" — that's free.

Use `useDOMPlane` when you want a **specific DOM image promoted to a WebGL plane** so shader effects (scroll distortion, RGB shift, motion blur, hover bulge) apply to it. That's the playfight-style "image as WebGL" pattern.

## Minimal template

```vue
<script setup>
useSeoMeta({ title: 'Work', description: '...' })
useAnims()
useWebGLPage('work')
const heroEl = ref(null)
useDOMPlane(heroEl, '/images/work-hero.webp')
</script>

<template>
  <div>
    <section class="relative h-screen">
      <div ref="heroEl" data-gl-hero class="absolute inset-0">
        <NuxtImg
          src="/images/work-hero.webp"
          alt="Work hero"
          class="h-full w-full object-cover"
        />
      </div>
      <Container>
        <h1 data-hero-title class="text-display">Work</h1>
      </Container>
    </section>
  </div>
</template>
```

The wrapper `<div ref="heroEl">` is the ref target. `useDOMPlane` reads its rect, creates a plane sized to match, loads the texture, hides the wrapper so DOM + mesh don't double-render. When the layer is off / on mobile, the wrapper stays visible and the inner `<NuxtImg>` renders normally — same markup serves both modes.

## Why a wrapper div instead of `ref` on `<NuxtImg>`

`NuxtImg` is a renderless Vue wrapper. A `ref` on it points to the component instance, not the DOM element. The wrapper div gives a stable `HTMLDivElement` to measure. Same rect, no ambiguity.

## Per-page personality

Tune shader uniforms without changing the base shader:

```ts
useDOMPlane(heroEl, src, {
  uniforms: { rgbShift: 0.5, blur: 0.6 },   // quiet, editorial
})

useDOMPlane(heroEl, src, {
  uniforms: { rgbShift: 2, blur: 1.5 },     // punchy, motion-forward
})

useDOMPlane(heroEl, src, {
  uniforms: { rgbShift: 0, blur: 0 },       // static, no scroll distortion
})
```

## Stacking and visibility

The WebGL canvas is `position: fixed; z-index: 0; pointer-events: none`. DOM text in positioned sections naturally paints on top. If text disappears under the canvas, add `relative z-10` to the text wrapper.

## Layer-off / mobile fallback

`useDOMPlane` early-returns `{ mesh: null, isReady: false }` when `useCanvas().enabled === false`. The DOM image inside the wrapper stays visible — same markup, no broken state.

## Texture cache

[TextureCache.js](layers/webgl/utils/TextureCache.js) dedupes by URL. Two pages with the same hero share one texture. The cache is global, persists across route changes.

## What this pattern doesn't cover (deferred)

- **Cross-page mesh flight** (image flies from list to detail) — `TransitionController` port not yet wired.
- **Hover bulge** (mouse hover distortion) — needs raycaster + per-frame `uMouse` update, not yet wired.
- **Particles / 3D models** — use `useCanvas()` directly; see [webgl-page](../webgl-page/SKILL.md).

## Key files

- [layers/webgl/composables/useDOMPlane.js](layers/webgl/composables/useDOMPlane.js)
- [layers/webgl/composables/useWebGLPage.js](layers/webgl/composables/useWebGLPage.js)
- [layers/webgl/components/WebGLCanvas.vue](layers/webgl/components/WebGLCanvas.vue)
- [layers/webgl/shaders/sharedVert.glsl](layers/webgl/shaders/sharedVert.glsl), [sharedFrag.glsl](layers/webgl/shaders/sharedFrag.glsl)
