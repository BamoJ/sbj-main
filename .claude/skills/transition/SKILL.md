---
name: transition
description: Nuxt page transitions + the WebGL placeholder mesh that reacts to route changes. Use when adjusting cross-page choreography, debugging hero-text/SplitText timing, or wiring optional DOMPlane meshes into the transition.
user-invokable: true
---

# Transition — Nuxt page transitions + WebGL placeholder reaction

## Architecture

Three systems collaborate on every route change:

1. **Nuxt page transition** ([app/transitions/pageTransition.js](app/transitions/pageTransition.js)) — Vue Transition hooks driven by GSAP. Authoritative for DOM choreography (clip-path reveal, SplitText hero, BG scale, page number).
2. **WebGL placeholder mesh** ([layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js)) — a persistent fullscreen plane created once at boot. Baseline = subtle bottom-edge wave. During transitions = full-screen radial pulse. Always present. Pages don't have to opt in.
3. **`usePageTransition()`** ([layers/webgl/composables/usePageTransition.js](layers/webgl/composables/usePageTransition.js)) — drives the `uTransition` uniform on the placeholder (and any opt-in DOMPlane meshes that registered themselves).
4. **Emitter signals** ([app/utils/Emitter.js](app/utils/Emitter.js)) — `transition:start` / `transition:complete` for any cross-system listener (preloader, cursor follower, analytics).

`useLenis()` ([app/composables/useLenis.js](app/composables/useLenis.js)) drives a single `gsap.ticker` RAF. The WebGL plugin hooks the same ticker, so Lenis + ScrollTrigger + WebGL share one frame budget.

## The transition object

`pageTransition.js` exports a plain object consumed by `<NuxtPage :transition="pageTransition" />` in app.vue.

```js
export const pageTransition = {
  mode: 'default',   // 'default' = simultaneous (overlap). 'out-in' = sequential.
  css: false,        // GSAP owns the animation — no Vue CSS classes.

  onLeave(el, done) { ... },        // emits 'transition:start' + calls prepareTransition()
  onBeforeEnter(el) { ... },        // pin + clipPath INSET must land here
  async onEnter(el, done) { ... },  // clip reveal + SplitText + enterTransition()
}
```

### Why `mode: 'default'`

Nuxt's default merge would make it `'out-in'` (sequential — leave fully, then enter). `mode: 'default'` enables Vue's simultaneous mode so the new page starts revealing while the old fades — that's the cross-fade feel.

### Why `onBeforeEnter` does the pinning

`onBeforeEnter` fires synchronously **before paint**. If you put `position: fixed; clipPath: inset(100% 0 0 0)` in `onEnter` instead, there's a frame where the new page paints fully visible before our styles apply → "pop" jank. The pin has to land before the browser ever paints the new page.

## Hero choreography

The hero `<h1 data-hero-title>` gets SplitText applied during `onEnter`. Two paths:

- **Sync hero** (most pages): `data-hero-title` is already in the DOM at transition time. SplitText fires with `delay: 0.65` so the chars enter while the clip-path reveal is mid-way.
- **Async hero** (Sanity CMS pages where `<SectionHero>` renders only after fetch): `MutationObserver` watches the page root, sets `opacity: 0` on the hero the instant it lands (same JS task → no flash), then runs SplitText. Falls back after 600ms if the hero never appears. Delay drops to `0.5`.

`await document.fonts.ready` runs before SplitText so font metrics are stable. `ScrollTrigger.refresh()` fires at the end of the clip reveal to recompute any scroll-triggered animations against the live layout.

## WebGL hooks

```js
// onLeave (start)
emitter.emit('transition:start', { direction: 'leave' })
usePageTransition().prepareTransition()
// → uTransition 0 → 1 on placeholder (and any DOMPlane meshes)

// onEnter (after clip-path reveal + SplitText setup)
usePageTransition().enterTransition(delay)
// → uTransition 1 → 0; per-page DOMPlane uniforms (uReveal, uOpacity) animate if present
```

By default the **only** mesh receiving these hooks is the placeholder created in the plugin. Pages that call `useDOMPlane()` register their meshes too, and they animate alongside the placeholder.

## Layer-off / mobile path

When `isMobile()` returns true OR `extends: ['layers/webgl']` is removed:
- `usePageTransition()`'s functions early-return — no error, no fade calls.
- The DOM-only choreography (clip + SplitText + bg scale + number) runs unchanged.
- Visual result: identical to the WebGL-on version minus the placeholder pulse.

No `if (webgl)` branches needed in `pageTransition.js` — the composables guard themselves.

## 60fps rules

1. **`document.fonts.ready` once per transition** — Cached after first await.
2. **MutationObserver is bounded** — 600ms timeout prevents leaks if a CMS page never resolves a hero.
3. **No layout reads during the clip animation** — Read once at the start, cache, mutate via GSAP.

## Key files

- [app/transitions/pageTransition.js](app/transitions/pageTransition.js) — the choreography
- [app/app.vue](app/app.vue) — `<NuxtPage :transition="pageTransition" />`
- [app/composables/useLenis.js](app/composables/useLenis.js) — Lenis singleton + GSAP ticker
- [app/utils/Emitter.js](app/utils/Emitter.js) — cross-layer signals
- [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js) — placeholder mesh + uTransition uniform
- [layers/webgl/composables/usePageTransition.js](layers/webgl/composables/usePageTransition.js) — the hooks
