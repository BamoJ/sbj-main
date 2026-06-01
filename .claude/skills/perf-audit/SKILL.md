---
name: perf-audit
description: Audit and fix performance issues to maintain 60fps. Use when diagnosing frame drops, janky scroll, hover lag, transition stutter, or any performance degradation.
user-invokable: true
---

# Performance Audit — 60fps across all browsers and devices

## The target

**60fps = 16.67ms per frame.** Every frame must complete all JS, layout, paint, and compositing within budget. Mobile is tighter due to weaker GPUs and thermal throttling.

## Quick audit checklist

Ordered by likelihood of being the problem.

### 1. Pixel ratio cap

**Check:** [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js) → `mount()`

```js
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
```

- Must be capped at 2. Never 3+.
- 3x = 2.25x more pixels than 2x. Mobile GPUs can't handle it.

### 2. Geometry segment count

**Check:** [layers/webgl/composables/useDOMPlane.js](layers/webgl/composables/useDOMPlane.js)

- Default: `PlaneGeometry(w, h, 24, 24)` = 576 vertices per plane (only when `useDOMPlane` is in use; the placeholder mesh has no segments worth worrying about).
- Under 20 planes: acceptable.
- 50+ planes: consider 16×16 (256 per plane) or skip vertex deformation entirely (1×1).

### 3. Texture sizes + dedup

**Check:** [layers/webgl/utils/TextureCache.js](layers/webgl/utils/TextureCache.js)

- All texture loads go through `textureCache.load(src)` — never `new TextureLoader().load()` directly (skips dedup).
- Image dimensions: 2048×2048 max for desktop, 1024×1024 for mobile.
- `texture.minFilter = LinearFilter` and `texture.generateMipmaps = false` (already set in TextureCache) — avoids mipmap generation cost for UI textures.
- 20+ unique large textures will pressure mobile memory.

### 4. RAF time source

**Check:** [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js) → `tickerCallback`

The plugin uses `gsap.ticker` so Lenis + ScrollTrigger + WebGL share one RAF loop. If you add custom RAF subscriptions, attach to `emitter.on('webgl:tick', ...)` instead of `requestAnimationFrame` directly — that ensures order stays consistent.

If frames jump after returning to a tab, suspect the per-tick `clock.getDelta()` returning a huge value. Cap with `Math.min(delta, 0.1)` if needed (not currently capped; add only if you see jumps).

### 5. getBoundingClientRect cost

**Check:** [layers/webgl/composables/useDOMPlane.js](layers/webgl/composables/useDOMPlane.js) → `syncPosition()`

- Called every frame for every opt-in DOMPlane mesh to sync with scroll.
- Each call forces layout recalc if DOM was just written.
- Under 20 planes: fine.
- Over 20 planes: cache rects and update only on Lenis `scroll` events instead of every frame.

### 6. Shader complexity

**Check:** [layers/webgl/shaders/sharedFrag.glsl](layers/webgl/shaders/sharedFrag.glsl)

- Count `texture2D()` calls. Current sharedFrag has up to 11 (3 sharp RGB + 8 blur samples) when motion blur is active.
- The blur loop has an early-out when `blurAmount < 0.001` — keep that guard.
- Avoid `pow()`, `log()`, `exp()` on mobile — use multiplication. The bulge() function already uses `dist * dist` instead of `pow(dist, 2.0)`.
- Avoid `if/else` — use `step()`, `mix()`, `smoothstep()`. The early-out in sharedFrag is the one acceptable exception (it's a hot performance gate).
- Precision: `highp float` is used at the top because the bulge math + scroll wave need it. Don't downgrade.

### 7. GSAP lag smoothing

**Check:** [app/composables/useLenis.js](app/composables/useLenis.js)

```js
gsap.ticker.lagSmoothing(0)
```

Must be set. Without it, GSAP drops frames to catch up → visible stutters.

### 8. Resize handler debounce

**Check:** [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js) → `resizeHandler`

Already debounced 150ms (`debounce()` at the bottom of the file). If you wire additional resize work, route it through `emitter.on('webgl:resize', ...)` so it picks up the debounced cadence.

### 9. Mobile WebGL bypass

**Check:** [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js) → `setup()`

```js
if (isMobile()) {
  nuxtApp.provide('webgl', makeDisabledContext())
  return
}
```

Hard bypass: no Three.js compiled, no scene, no RAF. `useCanvas()` returns `{ enabled: false }` and every composable downstream short-circuits. Don't break this.

### 10. Geometry / material disposal

**Check:** `dispose()` paths in [useDOMPlane.js](layers/webgl/composables/useDOMPlane.js), `unmount()` in [webgl.client.js](layers/webgl/plugins/webgl.client.js)

- Every `new PlaneGeometry()` must have a matching `.dispose()`.
- Every `new ShaderMaterial()` must have a matching `.dispose()`.
- The placeholder mesh + its material are disposed in `unmount()`.
- DOMPlane meshes dispose in the composable's `onUnmounted` path.

### 11. Event listener cleanup

- DOMPlane subscribes to `webgl:tick` + `webgl:resize` and unsubscribes on unmount.
- Components use the AbortController pattern (see [component](../component/SKILL.md)).
- Leaked listeners → ghost events + GC pressure over time.

## Draw call counting

Each mesh = 1 draw call. In dev console:

```js
console.log(useNuxtApp().$webgl.renderer.info.render)
// { calls, triangles, points, lines, frame }
```

- Under 50 draw calls: fine.
- 50–100: monitor.
- Over 100: InstancedMesh or merge geometries.

## Chrome DevTools profiling

### Performance tab

1. DevTools → Performance → Record.
2. Interact (scroll, hover, navigate).
3. Stop. Look for:
   - **Red bars** at top = dropped frames.
   - **Long tasks** (yellow > 16ms).
   - **Recalculate Style** (purple) = layout thrashing.
   - **Paint** (green) = excessive repaints.

### GPU profiling

DevTools → Performance → "GPU" checkbox. Look for GPU bar extending beyond 16ms. Causes: too many texture samples, high resolution, complex shaders.

### Memory tab

Heap Snapshot → search for `Texture`, `BufferGeometry`, `ShaderMaterial`. Compare snapshots before/after navigation to find leaks.

## Common performance fixes

### Frame drops on scroll

1. Check `getBoundingClientRect` call count (Performance panel).
2. Check ScrollTrigger count: `ScrollTrigger.getAll().length`.
3. Ensure scroll animations use `once: true` for one-shots (see [scroll-anim](../scroll-anim/SKILL.md)).
4. Confirm Lenis ↔ ScrollTrigger sync: `lenis.on('scroll', () => ScrollTrigger.update())` already wired in [useLenis.js](app/composables/useLenis.js).

### Frame drops on hover

1. Hover bulge not wired yet, so this is forward-looking. When it lands: check the lerp ease value (target ~0.09 — slower = smoother but more CPU per frame).
2. Check shader complexity in the bulge() path.
3. Check for leaked listeners (AbortController not aborted).

### Frame drops during transition

1. The placeholder mesh's transition uniforms are simple (one gsap.to per uniform). Cheap.
2. If you add a TransitionController port for mesh flight, expect 64×64 geometry rebuild per frame during the 1.5s animation — that's the intentional cost.
3. Kill orphan timelines: `gsap.killTweensOf(target)`.

### Janky text animations

1. Check SplitText element count — 50+ chars in a stagger is heavy.
2. Use `autoAlpha` not `opacity` (enables `visibility: hidden` at 0).
3. Mobile: skip SplitText, use simple opacity fade (the `ParaReveal` pattern).

### High GPU memory

1. `useNuxtApp().$webgl.renderer.info.memory` → `{ geometries, textures }` count.
2. Check `textureCache.cache.size` for orphaned textures.
3. Cap texture sizes per the recommendations above.
4. Dispose textures when pages are destroyed (DOMPlane handles this automatically; raw `useCanvas()` users do it manually).

## Cross-browser performance targets

| Platform | Target | Notes |
|---|---|---|
| Chrome Desktop | 60fps | Baseline. |
| Safari Desktop | 60fps | WebGL context limit (~16). Fewer canvases. |
| Firefox Desktop | 60fps | Stricter GLSL. Slightly different RAF timing. |
| Chrome Android | 60fps | Mobile bypass already disables WebGL ≤ 768px. |
| Safari iOS | 60fps* | *May default to 30fps on older devices. |
| Low-end Android | 30fps | Acceptable. WebGL bypass already on. |

### Safari-specific

- WebGL context limit: ~16. Each canvas = 1 context. We only have one (the persistent canvas).
- Aggressive tab throttling: clock.getDelta() can spike after tab refocus.
- `powerPreference: 'high-performance'` already set in the plugin.

### Mobile

- Mobile bypass already disables WebGL ≤ 768px via `isMobile()`. Don't undo this.
- Touch event handlers should use `{ passive: true }` for scroll/touch listeners.
- `syncTouches: true` already set in Lenis config ([useLenis.js](app/composables/useLenis.js)).

### Firefox

- Stricter GLSL validation: always declare precision, no undeclared vars.
- Different RAF timing: use delta-based animation, never frame-count.

## Key files

- [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js) — Renderer, pixel ratio, debounced resize, gsap.ticker RAF, placeholder mesh
- [layers/webgl/composables/useDOMPlane.js](layers/webgl/composables/useDOMPlane.js) — `getBoundingClientRect`, geometry, per-frame sync
- [layers/webgl/utils/TextureCache.js](layers/webgl/utils/TextureCache.js) — texture memory + dedup
- [layers/webgl/shaders/sharedFrag.glsl](layers/webgl/shaders/sharedFrag.glsl) — fragment shader cost (texture samples, blur loop)
- [layers/webgl/shaders/sharedVert.glsl](layers/webgl/shaders/sharedVert.glsl) — vertex shader cost (Perlin noise inline)
- [app/composables/useLenis.js](app/composables/useLenis.js) — Lenis singleton, `gsap.ticker.lagSmoothing(0)`
- [app/utils/media.js](app/utils/media.js) — `isMobile()`, `prefersReducedMotion()`
