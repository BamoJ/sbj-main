---
name: webgl-page
description: Optional per-page WebGL hooks. Use only when a page needs its own WebGL behaviour beyond the always-on placeholder mesh — e.g., custom per-frame updates, raycaster hover, or mesh-flight.
user-invokable: true
---

# WebGL Page — optional per-page registration

## The default

**Pages do NOT need to call anything.** The WebGL canvas is mounted once in [app/app.vue](app/app.vue) via `<WebGLCanvas />`. The plugin creates a persistent placeholder mesh (subtle bottom-edge wave at rest, full-screen radial pulse during route changes). The transition automatically drives it via `usePageTransition()` from [app/transitions/pageTransition.js](app/transitions/pageTransition.js).

If you just want WebGL alive during transitions, do nothing. It's already on.

## When to use `useWebGLPage(name)`

Call this only when a page needs more than the default placeholder:

```vue
<script setup>
const { handle } = useWebGLPage('my-page')

// Custom per-frame update — runs inside the unified RAF loop.
handle.update = (time) => {
  // time = { delta, elapsed }
  // mutate scene objects you've added directly via useCanvas()
}
</script>
```

Returns `{ name, enabled, handle }`. `enabled === false` on mobile or when the layer is removed — your code never throws.

## When to use `useDOMPlane(elementRef, textureUrl, options)`

When a page wants a WebGL plane mapped to a DOM element (image hero with shader effects, etc.). This is the helper for "real DOMPlane-style integration" — see the [webgl-dom-page](../webgl-dom-page/SKILL.md) skill for the full pattern.

```vue
<script setup>
useWebGLPage('home')
const heroEl = ref(null)
useDOMPlane(heroEl, '/images/hero.webp', { uniforms: { rgbShift: 1.5 } })
</script>

<template>
  <div ref="heroEl" data-gl-hero class="absolute inset-0">
    <NuxtImg src="/images/hero.webp" class="h-full w-full object-cover" />
  </div>
</template>
```

The plane:
- Sizes itself to the DOM rect (FOV-based viewport math)
- Syncs position every frame so scroll + layout stay glued
- Applies cover-fit UV (object-fit: cover semantics)
- Auto-registers with the transition mesh registry (fades on route change like the placeholder)
- Auto-disposes geometry + material + listeners on unmount

## Direct scene access

For particles, instanced meshes, raw 3D scenes — bypass `useDOMPlane` and work with the scene directly:

```ts
const { scene, camera, time } = useCanvas()
const particles = new Points(...)
scene.add(particles)
useWebGLPage('experiments').handle.update = ({ delta }) => {
  particles.rotation.y += delta * 0.5
}
onUnmounted(() => {
  scene.remove(particles)
  particles.geometry.dispose()
  particles.material.dispose()
})
```

## Per-page shader uniform tuning (DOMPlane only)

`useDOMPlane` exposes shared-shader uniforms each page can tune:

| Uniform | What it controls |
|---|---|
| `rgbShift` | RGB shift strength on scroll |
| `blur` | Motion blur strength on scroll |
| `bulge` | Hover bulge intensity (0 = off) |
| `bulgeStrength` | Bulge curve shape |

```ts
useDOMPlane(heroEl, src, { uniforms: { rgbShift: 2, blur: 1.5 } })
```

## Key files

- [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js) — placeholder mesh + RAF loop
- [layers/webgl/composables/useCanvas.js](layers/webgl/composables/useCanvas.js)
- [layers/webgl/composables/useWebGLPage.js](layers/webgl/composables/useWebGLPage.js)
- [layers/webgl/composables/useDOMPlane.js](layers/webgl/composables/useDOMPlane.js)
- [layers/webgl/composables/usePageTransition.js](layers/webgl/composables/usePageTransition.js)
