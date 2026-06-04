---
name: webgl-toggle
description: How the WebGL layer turns itself on/off (capability gate + the reactive 768px breakpoint switch with a static BG fallback) and the manual procedure to remove the layer entirely. Use to change the breakpoint, understand the desktop↔mobile swap, or strip WebGL from a project.
user-invokable: true
---

# WebGL toggle — automatic switch + manual removal

WebGL is **ON** by default, but it gates itself two ways before anything renders. Read
[webgl-canvas](../webgl-canvas/SKILL.md) for the architecture.

## Default wiring (what's ON)

- [nuxt.config.ts](nuxt.config.ts): `extends: ['layers/webgl']`
- [app/app.vue](app/app.vue): `<WebGLCanvas />` inside `<Theme>` + `<NuxtPage :transition="pageTransition" />`
- [app/transitions/pageTransition.js](app/transitions/pageTransition.js): `onEnter` → `$webgl.onChange(useRoute().name, el)` (view swap)
- [app/pages/index.vue](app/pages/index.vue): `showLogoFallback = computed(() => !webgl?.activeRef?.value)` → shows the static `texture.png` BG when WebGL isn't active.

## Automatic gating (no edits needed)

Both live in [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js):

1. **Capability gate** — `if (prefersReducedMotion() || isTouch())` (from
   [app/utils/media.js](app/utils/media.js)) → provides a disabled stub `$webgl`
   (`enabled:false`, `activeRef: ref(false)`); **no Three.js is built**. Touch devices and
   reduced-motion users get the static BG, always. Fixed per device.
2. **Responsive switch** — a reactive `activeRef` tied to
   `matchMedia('(min-width: 768px)')`. `WebGLCanvas.vue` builds on first activation, then
   `v-show` + `setRenderActive()` show/hide + pause/resume the render loop as the viewport
   crosses the breakpoint. `index.vue` flips to the BG when `!activeRef`. **Instant, on
   resize, no reload.**

Net: desktop ≥768px → particles; <768px / touch / reduced-motion → static `texture.png`.

### Change the breakpoint
Edit the `BREAKPOINT` string in `webgl.client.js`:
```js
const BREAKPOINT = '(min-width: 768px)'   // ← e.g. 1024px to disable on tablets too
```

### Change what counts as "no WebGL"
Edit the capability gate. `isTouch()` = `matchMedia('(hover: none), (pointer: coarse)')`.
Drop `isTouch()` to run on touch devices; add other conditions as needed.

## Removing the layer entirely (hard off)

For a project that wants no WebGL at all:

1. **nuxt.config.ts** — delete `extends: ['layers/webgl']`.
2. **app/app.vue** — delete `<WebGLCanvas />`.
3. **app/transitions/pageTransition.js** — in `onEnter`, delete the
   `const { $webgl } = useNuxtApp(); $webgl?.onChange?.(useRoute().name, el)` lines. Keep
   the `emitter.emit('transition:start' | 'transition:complete')` signals.
4. **app/pages/index.vue** — `useWebGL()` is a layer composable, so it disappears with the
   layer. Drop `const webgl = useWebGL()` and hard-set `const showLogoFallback = true` (or
   just always render the `<NuxtImg src="/images/texture.png">`). The static BG becomes the
   permanent hero.
5. **(optional)** `rm -rf layers/webgl && bun install` — drops `three` from the bundle.

Result: pure GSAP / Lenis / Sanity Nuxt starter, no Three.js, the `texture.png` hero
everywhere. Transitions still run (DOM only).

## Turning it back on
Reverse steps 1–4 (restore `extends`, `<WebGLCanvas />`, the `$webgl.onChange` call in
`onEnter`, and `index.vue`'s `useWebGL()` + reactive `showLogoFallback`). If you deleted
`layers/webgl/`, restore it from git, then `bun install`.

## Notes
- No `bun run disable-webgl` script — the edits above are the whole procedure and the
  touch points are small/stable.
- `three` lives in `layers/webgl/package.json`; after restoring the layer run
  `cd layers/webgl && bun install` (see CLAUDE.md gotchas).

## Cross-references
- [webgl-canvas](../webgl-canvas/SKILL.md) — architecture
- [transition](../transition/SKILL.md) — what `onChange` does during nav
- [new-project](../new-project/SKILL.md) — the keep/remove decision during scaffolding
