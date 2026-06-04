---
name: transition
description: Nuxt page transitions (GSAP clip-path + SplitText hero) and how they drive the WebGL view swap via $webgl.onChange. Use when adjusting cross-page choreography, debugging hero-text timing, or planning a cross-page WebGL plane transition.
user-invokable: true
---

# Transition — Nuxt page transitions + WebGL view swap

## Architecture

On every route change:

1. **Nuxt page transition** ([app/transitions/pageTransition.js](app/transitions/pageTransition.js))
   — Vue Transition hooks driven by GSAP. Authoritative for DOM choreography (clip-path
   reveal, SplitText hero, BG scale, page number).
2. **WebGL view swap** — `onEnter` calls `$webgl.onChange(useRoute().name, el)`, which
   swaps the active `Page` view (see [canvas-nav](../canvas-nav/SKILL.md)). No placeholder
   mesh, no per-mesh uniform fades — the engine just swaps which view renders.
3. **Emitter signals** ([app/utils/Emitter.js](app/utils/Emitter.js)) — `transition:start`
   / `transition:complete` for any cross-system listener (cursor, analytics).

`useLenis()` drives a single `gsap.ticker` RAF; the WebGL plugin hooks the same ticker,
so Lenis + ScrollTrigger + WebGL share one frame.

## The transition object

`pageTransition.js` exports a plain object consumed by
`<NuxtPage :transition="pageTransition" />` in `app.vue`.

```js
export const pageTransition = {
  mode: 'default',   // simultaneous (overlap). Nuxt's default merge would force 'out-in'.
  css: false,        // GSAP owns the animation — no Vue CSS classes.

  onLeave(el, done) { ... },        // emits 'transition:start' + fades the old page out
  onBeforeEnter(el) { ... },        // pin + clipPath INSET must land here (pre-paint)
  async onEnter(el, done) { ... },  // $webgl.onChange(route.name, el) + clip reveal + SplitText
}
```

### Why `mode: 'default'`
Nuxt's default merge makes it `'out-in'` (leave fully, then enter). `'default'` enables
Vue's simultaneous mode so the new page reveals while the old fades.

### Why `onBeforeEnter` does the pinning
`onBeforeEnter` fires synchronously **before paint**. Putting `position: fixed; clipPath:
inset(100% 0 0 0)` in `onEnter` instead leaves a frame where the new page paints fully
visible → "pop" jank. Pin before first paint.

## Hero choreography

The hero `<h1 data-hero-title>` gets SplitText during `onEnter`:
- **Sync hero** (in DOM at transition time): SplitText at `delay: 0.65` so chars enter
  mid clip-reveal.
- **Async hero** (Sanity/CMS rendered after fetch): a `MutationObserver` sets `opacity: 0`
  the instant the hero lands (same JS task → no flash), then SplitText; 600ms timeout
  fallback; `delay` drops to `0.5`.

`await document.fonts.ready` runs before SplitText (stable metrics). `ScrollTrigger.refresh()`
fires at the end of the reveal to recompute scroll triggers against live layout.

## WebGL hook (current)

```js
// onEnter — el is the new page's mounted DOM.
const { $webgl } = useNuxtApp()
$webgl?.onChange?.(useRoute().name, el)
```

That's it — the view swap is a registry lookup + `Page` lifecycle (`onLeave`/`onEnter`),
not a uniform animation. On touch / reduced-motion / below the breakpoint, `$webgl` is the
disabled stub (or paused), so `onChange` is a safe no-op and the DOM choreography runs
unchanged — no `if (webgl)` branches needed.

## Cross-page WebGL plane flight (available — DORMANT)

Ported and wired, but **inert until a page uses it** — a textured plane flies from a
thumbnail on page A into the destination slot on page B.

- **`canvas/TransitionController.js`** (`$webgl.transition`, instantiated in `Canvas.mount`)
  listens for `webgl:transition:prepare`. A source page emits it with a plane mesh on link
  click; the controller clones + stages it and hides the source.
- **`pageTransition.js` → `runPlaneFlight($webgl, el)`** (called in `onEnter`) is the
  destination side: if a mesh is staged (`$webgl.transition.staged`) AND `el` has a
  `[data-gl-target]`, it calls `getFlightContext(rect)` and runs the GSAP flight (mesh
  transform + `uPageTransition` ripple + `uOpacity` handoff), then `ctx.cleanup()`. No
  staged mesh / no `[data-gl-target]` ⇒ **no-op**.

What's missing to light it up: a page with **DOMPlanes** (`[data-gl="img"]`) whose link
click emits `webgl:transition:prepare` with the plane, and a destination with
`[data-gl-target]`. The plane side is the [dom-plane](../dom-plane/SKILL.md) toolkit (also
dormant). Until such a page exists, both sit ready and do nothing.

## 60fps rules
1. `document.fonts.ready` once per transition (cached after first await).
2. MutationObserver bounded (600ms timeout) — no leak if a CMS hero never resolves.
3. No layout reads during the clip animation — read once, cache, mutate via GSAP.

## Key files
- [app/transitions/pageTransition.js](app/transitions/pageTransition.js) — choreography + `$webgl.onChange`
- [app/app.vue](app/app.vue) — `<NuxtPage :transition="pageTransition" />`
- [layers/webgl/canvas/index.js](layers/webgl/canvas/index.js) — `onChange` view swap
- [app/composables/useLenis.js](app/composables/useLenis.js) — Lenis singleton + GSAP ticker
- [app/utils/Emitter.js](app/utils/Emitter.js) — cross-layer signals
