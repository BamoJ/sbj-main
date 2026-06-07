---
name: perf-audit
description: Audit and fix performance issues to maintain 60fps. Use when diagnosing frame drops, janky scroll, hover lag, transition stutter, or any performance degradation.
user-invokable: true
---

# Performance Audit — 60fps

**60fps = 16.67ms/frame.** WebGL is desktop-only here (disabled on touch / reduced-motion
and paused below 768px — see [webgl-toggle](../webgl-toggle/SKILL.md)), so the WebGL budget
targets desktop GPUs.

## WebGL checklist (current architecture)

### 1. Pixel ratio cap
[layers/webgl/canvas/index.js](layers/webgl/canvas/index.js) → `mount()`:
`renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`. Cap at 2; never 3+.
(Note: the renderer's drawing-buffer ratio must match any code that maps mouse→pixels, or
the cursor interaction desyncs — keep them consistent.)

### 2. Particle count (the Home view)
The Home view rasterizes the logo into ~one particle per opaque pixel, **bounded by
`config.maxLogoWidth`** in [home.js](layers/webgl/canvas/Home/home.js) (~1000px ⇒ a few
hundred k particles). The GPU sim cost scales with this — the sim texture is ≈
`sqrt(count)²`. Lower `maxLogoWidth` to cut cost. This is view-specific, not a layer rule.

### 3. GPU simulation cost
[Simulation.js](layers/webgl/canvas/Home/Simulation.js) runs **one ping-pong fullscreen
pass per frame** over the particle texture (`sim.frag.glsl`), then the points are rendered.
- The curl-noise (6 simplex taps/particle) is gated by `if (uFlowStrength > 0.0001)` — keep
  that guard so it's free when flow is off.
- Needs WebGL2 float render targets; HalfFloat fallback in `Simulation.js`.

### 4. Render loop + idle/visibility/sleep pause
`gsap.ticker → canvas.time.tick() → trigger('tick') → Canvas.update()` — one RAF for
Lenis + ScrollTrigger + WebGL. Don't add separate `requestAnimationFrame` loops; hook the
ticker. Three gates stop the GPU work (the ticker keeps firing for Lenis throughout — only
the sim + draw stop):
- **Breakpoint** — `Canvas.update()` early-returns unless `renderActive`; `WebGLCanvas.vue`
  calls `setRenderActive(false)` below 768px (static BG shows).
- **Tab visibility** — `webgl.client.js` exposes `visibleRef` (a `visibilitychange` listener);
  `WebGLCanvas.vue` folds it into `active` (`active = desktop && visible`), so a hidden tab
  pauses (no background-tab GPU cost). Uses `visibilitychange` only, never blur/focus.
- **Idle-sleep (render-on-demand)** — the Home view exposes `get needsRender()`
  ([home.js](layers/webgl/canvas/Home/home.js)): true only while the intro gather tween runs,
  a mouse impulse is coasting (`animationCount`), or a few `_wakeFrames` after enter/resize.
  When false the logo is settled + static (flow off), so `Home.update()` skips the sim pass and
  `Canvas.update()` skips the draw — the last frame stays on screen. A `mousemove` sets
  `animationCount = 300`, waking it on the next tick. **This is the main idle power fix** — at
  rest the hero costs ~0 GPU instead of re-simulating 262k particles forever. A new view that
  animates continuously should give it a `needsRender` getter (or omit it to render every
  frame, the backward-compatible default).

### FPS overlay (dev)
[FpsMeter.vue](app/components/Global/FpsMeter.vue) — dev-only on-screen meter, **Shift+F** to
toggle (mounted behind `import.meta.dev` in [app.vue](app/app.vue); never ships to prod).
Shows **fps** (gsap.ticker/rAF rate — stays at display refresh), **GL draws/s**
(`renderer.info.render.frame` delta — the key line: **~0 when the sim is asleep or the tab is
hidden**, ~refresh while interacting), draw **calls / points**, and frame **ms** (green ≥58 /
amber ≥45 / red). Zero-code cross-checks: Chrome DevTools → Rendering → **Frame Rendering
Stats**, and **Chrome Task Manager** (Shift+Esc) → GPU column.

### 5. Capability bypass (don't break)
[webgl.client.js](layers/webgl/plugins/webgl.client.js) `setup()`:
`if (prefersReducedMotion() || isTouch())` → disabled stub, **no Three.js built**. Touch /
reduced-motion never pay any WebGL cost.

### 6. GSAP lag smoothing
[useLenis.js](app/composables/useLenis.js): `gsap.ticker.lagSmoothing(0)` must be set, or
GSAP drops frames to catch up after a stall → stutter.

### 7. Disposal (leaks)
- `Page.destroy()` ([Page.js](layers/webgl/canvas/Page.js)) traverses `elements` and
  disposes geometries/materials.
- A view with extra resources disposes them in its own `destroy()` — e.g. `Home.destroy()`
  disposes the `Simulation` (both render targets + data textures) and the color texture.
- `Canvas.unmount()` disposes the renderer and tears down all cached views.
- Note: views are **cached** in `Canvas.pages` and only fully disposed on `unmount()` (not
  on route leave) — fine for a few views; revisit if you register many heavy ones.

### 8. Resize work
`Canvas` adds a `window 'resize'` listener → `onResize()` → `currentPage.onResize()`. The
Home view rebuilds its particle origins + re-seeds the sim on resize — moderate. It is
**not** debounced; if you add heavier resize work, debounce it.

### 9. Textures
`TextureCache` ([utils/TextureCache.js](layers/webgl/utils/TextureCache.js)) dedups
+ disables mipmaps for views that load textures. (The Home logo is loaded once via `Image`
+ rasterized, not through the cache.) Keep source images ≤ 2048² on desktop.

## Draw calls / GPU info
```js
const w = useNuxtApp().$webgl
console.log(w.renderer?.info.render)   // { calls, triangles, points, frame }
console.log(w.renderer?.info.memory)   // { geometries, textures }
```
One persistent canvas = one context. Under ~50 draw calls is fine.

## Chrome DevTools
- **Performance** → Record → interact → stop. Red bars = dropped frames; yellow >16ms =
  long tasks; purple = layout thrashing; green = repaint. Tick **GPU** to see GPU time.
- **Memory** → Heap Snapshot → search `Texture` / `BufferGeometry` / `ShaderMaterial`;
  compare before/after nav to find leaks.

## Common fixes
- **Scroll jank** — check `ScrollTrigger.getAll().length`; use `once:true` for one-shots;
  Lenis↔ScrollTrigger sync is wired in [useLenis.js](app/composables/useLenis.js).
- **Transition stutter** — kill orphan timelines (`gsap.killTweensOf`). The view swap
  itself is cheap; a future `TransitionController` plane-flight port would add a per-frame
  geometry rebuild during the flight (intentional cost) — see [transition](../transition/SKILL.md).
- **Text jank** — SplitText 50+ chars is heavy; use `autoAlpha`; on mobile skip SplitText.
- **High GPU memory** — dispose on teardown (see §7); cap texture sizes.

## Cross-browser targets
| Platform | Target | Notes |
|---|---|---|
| Chrome / Firefox / Safari desktop | 60fps | one WebGL context; `powerPreference:'high-performance'` set |
| Touch / mobile | n/a for WebGL | layer disabled — static BG; keep touch listeners `{ passive:true }` |

Firefox: strict GLSL (declare precision, no undeclared vars). Safari: aggressive tab
throttling can spike `Time` delta after refocus (`Time.tick` clamps delta to 60ms).

## Key files
- [layers/webgl/canvas/index.js](layers/webgl/canvas/index.js) — renderer, pixel ratio, `update`/`setRenderActive`, resize
- [layers/webgl/canvas/Home/Simulation.js](layers/webgl/canvas/Home/Simulation.js) — GPU ping-pong cost
- [layers/webgl/canvas/Home/home.js](layers/webgl/canvas/Home/home.js) — particle count (`maxLogoWidth`)
- [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js) — capability gate, `activeRef`, gsap.ticker
- [app/composables/useLenis.js](app/composables/useLenis.js) — `gsap.ticker.lagSmoothing(0)`
- [app/utils/media.js](app/utils/media.js) — `isTouch()`, `prefersReducedMotion()`
