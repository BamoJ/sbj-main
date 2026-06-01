---
name: smoothyslider
description: Use the starter's <Slider> component + useSmoothy composable for any carousel, gallery, deck, or marquee. Wraps the smooothy motion engine with Swiper-style chrome (arrows, dots, autoplay, keyboard) and exposes per-slide active state for styling.
user-invokable: true
---

# Slider — `<Slider>` + `useSmoothy`

One configurable primitive for every slider use case in the starter. The motion engine is [smooothy](https://github.com/vallafederico/smooothy) (the same library playfight runs in production); on top of it the starter adds Vue lifecycle, all the standard UX chrome, and a per-slide active-state contract so design can drive how slides look as they enter/leave the centered position.

Slide content is project-specific — the component owns motion + chrome, the caller writes whatever DOM each slide needs via a scoped slot.

## When to use it

- Project galleries, case-study image strips, testimonial decks, logo marquees, hero rotators — anything that scrolls horizontally or vertically with snap, infinite loop, or free drag.
- Anything where you'd reach for Swiper, Embla, or Keen-Slider on a vanilla project.

## When NOT to use it

- Auto-scrolling text marquee with **no interaction needed** — pure CSS `@keyframes` is lighter (smooothy still ships ~10KB and runs a RAF).
- Vertical page-level scroll — that's Lenis's job ([useLenis](../../app/composables/useLenis.js)).
- Anything pinned to scroll progress — use GSAP ScrollTrigger.

## Architecture

```
app/composables/useSmoothy.js          composable wrapping smooothy Core
app/components/UI/slider/Slider.vue    primary component (props/slots/events)
app/components/UI/slider/SliderArrow.vue       default prev/next chrome
app/components/UI/slider/SliderPagination.vue  default dots chrome
```

Demo live in [app/pages/work.vue](../../app/pages/work.vue) — exercises infinite snap + 1.5 slides-per-view + active-state styling + the `--slide-distance` CSS variable.

## DOM the slider renders

Just `<ul>` + `<li>`. Two elements. Matches the official smooothy demo exactly.

```html
<ul class="slider slider--centered" style="--slide-w: 22vw; --slide-gap: 1rem">
  <li class="your-class">…your slide content…</li>
  <li class="your-class">…</li>
</ul>
```

The Slider component renders ONLY the `<ul>`. The `<li>` and everything inside it comes from your scoped slot. You own the slide markup completely — no nested wrappers between `<ul>` and your `<li>`.

## `<Slider>` props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `Array` | `[]` | Slide data. One scoped-slot render per item. |
| `slideWidth` | `String` | `'25vw'` | CSS length for slide width. Exposed to your slide CSS as `var(--slide-w)` — use it on your `<li>` or an inner element. |
| `slideGap` | `String` | `'0px'` | Horizontal gap. Exposed as `var(--slide-gap)`. Apply it as `padding-inline` on your `<li>` (smooothy doesn't support `gap`; use padding instead). |
| `centered` | `Boolean` | `false` | Centers the first slide at the viewport center via `margin-left: calc(50% - var(--slide-w)/2 - var(--slide-gap))` on the wrapper. Pure CSS — no transform, transition-safe. |
| `infinite` | `Boolean` | `true` | Loop. `false` clamps at first/last. |
| `snap` | `Boolean` | `true` | Snap to slide on release. `false` = free drag. |
| `vertical` | `Boolean` | `false` | Vertical layout. Arrow keys = Up/Down. |
| `lerpFactor` | `Number` | mobile-adaptive | Lower = smoother (heavier trail). Composable picks `0.18` (mobile) / `0.3` (desktop) when omitted. |
| `snapStrength` | `Number` | mobile-adaptive | Snap aggressiveness. Same auto-tuning. |
| `scrollInput` | `Boolean` | `false` | Wheel/trackpad input. Off by default so Lenis owns page scroll. |
| `keyboard` | `Boolean` | `true` | Arrow keys when the slider is focused. |
| `autoplay` | `Number` | `0` | ms between advances. `0` = off. Pauses on user input. |

`<Slider>` is the engine only — it does NOT render arrows, dots, counters, or any chrome inside its DOM. Chrome is composed externally so each project can place buttons and dots anywhere in the layout. See "Composing chrome" below.

## Events

| Event | Payload | Notes |
|---|---|---|
| `slide-change` | `(current: number, previous: number)` | Fires once per snap to a new slide. |
| `update` | `{ speed, progress, parallaxValues }` | Every frame. Use for shader uniforms or scroll-linked overlays. |

## Slot

**Default (scoped, per item) — required:**
```vue
<template #default="{ item, index, isActive, total }">
  <article class="my-slide" :class="{ 'is-active': isActive }">
    <NuxtImg :src="item.image" :alt="item.title" />
    <h3>{{ item.title }}</h3>
  </article>
</template>
```

There are no chrome slots. Chrome is composed externally — see below.

## Composing chrome

`<Slider>` exposes its state + control surface via `defineExpose`. Grab a template ref, listen to `@slide-change`, and render `<SliderArrow>` / `<SliderPagination>` (or your own buttons) anywhere in the page layout.

**Exposed via template ref (`sliderRef.value` in script, `sliderRef` in template):**

| Property | Type | Notes |
|---|---|---|
| `currentSlide` | reactive ref | Read-only. Updated each frame by smooothy. |
| `progress` | reactive ref | 0–1 |
| `speed` | reactive ref | smoothed scroll speed |
| `total` | computed ref | `items.length` |
| `goToNext()` | function | |
| `goToPrev()` | function | |
| `goToIndex(i)` | function | |
| `setPaused(bool)` | function | Pauses input (drag/wheel), not RAF. |

**Standard external-chrome pattern:**

```vue
<script setup>
import Slider from '~/components/UI/slider/Slider.vue'
import SliderArrow from '~/components/UI/slider/SliderArrow.vue'
import SliderPagination from '~/components/UI/slider/SliderPagination.vue'

const sliderRef = ref(null)
const currentSlide = ref(0)
const items = [/* … */]
</script>

<template>
  <section>
    <Slider
      ref="sliderRef"
      :items="items"
      :slides-per-view="3"
      :centered="true"
      @slide-change="(cur) => (currentSlide = cur)"
    >
      <template #default="{ item, isActive }">
        <article :class="{ 'is-active': isActive }">…</article>
      </template>
    </Slider>

    <!-- Chrome lives wherever you want. Move these around freely. -->
    <div class="my-controls">
      <SliderArrow direction="prev" @click="sliderRef?.goToPrev()" />
      <SliderPagination
        :current="currentSlide"
        :total="items.length"
        @go-to="(i) => sliderRef?.goToIndex(i)"
      />
      <SliderArrow direction="next" @click="sliderRef?.goToNext()" />
    </div>
  </section>
</template>
```

**Why `@slide-change` + local `currentSlide` instead of reading the ref directly?** Template ref access to nested reactive properties is fragile across Vue versions. The event + local ref pattern is idiomatic, type-safe, and works the same everywhere.

**Custom buttons?** Skip `<SliderArrow>` entirely — any element calling `sliderRef?.goToNext()` works:
```vue
<button @click="sliderRef?.goToNext()">Next →</button>
<span>{{ currentSlide + 1 }} / {{ items.length }}</span>
```

## Active-state pattern — two layers

Both come from smooothy's existing state; pick whichever fits your design.

**1. Binary active (Swiper-style):** read `isActive` from the scoped slot.
```vue
<template #default="{ isActive }">
  <li :class="{ 'is-active': isActive }">…</li>
</template>
```

**2. Continuous distance — the better one for shader-y effects:** the slider writes `--slide-distance` on each slide element every frame. `0` = centered, `±0.5` = halfway to neighbor, etc.

**⚠️ CRITICAL — visual effects go on an INNER element, NOT the `<li>` itself.**

The `<li>` (slide) is smooothy's positioning element: smooothy writes `style.transform = translateX(...)` to it every frame. If you try to use `transform` in CSS on the `<li>`, it gets overridden. If you put `transition: transform` on the `<li>`, the browser will ANIMATE every one of smooothy's instant updates — including the infinite-loop wraparound jump (~8 × itemWidth in one frame), making slides visibly fly across the viewport. **Confirmed bug, fixed by following this pattern.**

```vue
<template #default="{ item, isActive }">
  <li class="my-slide" :class="{ 'is-active': isActive }">
    <img class="my-slide__media" :src="item.image" />
    <h3>{{ item.title }}</h3>
  </li>
</template>
```

```css
.my-slide {
  /* ✓ SAFE: opacity, color, child selectors, layout — smooothy doesn't touch these */
  opacity: calc(1 - min(abs(var(--slide-distance, 0)), 1) * 0.5);
  transition: opacity 0.15s linear;

  /* ✗ DO NOT add `transform` here — smooothy owns it */
  /* ✗ DO NOT add `transition: transform` here — animates wraparound jumps */
}

.my-slide__media {
  /* ✓ SAFE: this is an inner element. Smooothy doesn't touch it.
     transform + transition both work cleanly. */
  transform: scale(calc(1 - min(abs(var(--slide-distance, 0)), 1) * 0.15));
  transition: transform 0.15s linear;
  /* filter / blur also safe here */
}
```

**Rule of thumb:** anything you want to animate per-distance — `scale`, `rotate`, `blur`, `filter`, `clip-path` — goes on a CHILD of the `<li>`. The `<li>` itself is for opacity, classes, child selectors, and layout properties (width / padding) only. Frame-continuous, GPU-friendly. The slider only mutates the CSS var on the DOM element — Vue doesn't re-render per frame.

## ⚠️ Nuxt unmount-on-nav-click gotcha

`<NuxtPage>` wraps in Suspense + Transition. When you click a nav link, **the leaving component's `onBeforeUnmount` fires INSTANTLY**, not after the leave animation. Vue Transition keeps the DOM element visible for the animation, but the Vue component instance (and any state in it) is already torn down on click. This is because Nuxt's Suspense resolves the new page synchronously when the new page has no async setup, and the old page's instance is unmounted immediately.

For smooothy this matters because **calling `core.destroy()` in `onBeforeUnmount` causes a visible "snap to slide 0" the instant you click**. Smooothy's `destroy()` → `kill()` sets `style.transform = ""` on every slide, stripping the inline transforms smooothy was using to position them. The slides snap back to natural flex order, which (combined with our `margin-left` centering) puts slide 0 at the visual center. The user sees their position reset to 0 before the leave animation has a chance to fade it.

[useSmoothy.js](../../app/composables/useSmoothy.js) intentionally skips `core.destroy()` in `onBeforeUnmount`:

```js
onBeforeUnmount(() => {
  if (tickerFn) gsap.ticker.remove(tickerFn)
  // Skip destroy() — its kill() resets slide transforms and causes a visible
  // snap-to-0 on click (Suspense unmounts the leaving page synchronously).
  // Only disconnect the IntersectionObserver to stop background callbacks;
  // event listeners on the soon-to-be-removed DOM elements are GC'd naturally.
  instance.value?.observer?.disconnect()
  instance.value = null
  isReady.value = false
})
```

**Generalisable rule:** any side effect in `onBeforeUnmount` that mutates VISIBLE DOM state will fire on nav click, not when the user expects (after the leave animation). For animation-affecting cleanup: either skip it (let GC handle it as the DOM elements are removed after the animation) or defer it via a `transition:complete` signal. Plain JS cleanup (clearing intervals, removing global listeners) is fine — it's only the DOM-mutating cleanup that needs care.

## `useSmoothy(wrapperRef, options)` direct use

Skip `<Slider>` entirely if you need pure motion without the chrome (e.g., synced thumbnail pair, custom marquee with no buttons). Pass a template ref to the wrapper element whose direct children are slides.

```vue
<script setup>
const wrapperEl = ref(null)
const { currentSlide, progress, speed, goToNext } = useSmoothy(wrapperEl, {
  infinite: true,
  snap: false,
  onUpdate: (core) => {
    // core.speed, core.progress, core.parallaxValues, core.currentSlide …
  },
})
</script>

<template>
  <div ref="wrapperEl" class="flex overflow-hidden">
    <div v-for="i in 10" :key="i" class="shrink-0 w-1/3">Slide {{ i }}</div>
  </div>
</template>
```

Returns:
- `instance` — `shallowRef` to the underlying smooothy `Core`
- `currentSlide` / `progress` / `speed` — reactive refs updated each frame
- `isReady` — `true` after mount
- `goToNext()` / `goToPrev()` / `goToIndex(i)` / `setPaused(bool)`

The composable registers smooothy's `update()` on `gsap.ticker` (same RAF as Lenis + ScrollTrigger — clean frame ordering). Cleanup happens automatically on `onBeforeUnmount`.

## Snap alignment

Smooothy in fixed-width mode aligns slide 0 to the **leading edge** of the wrapper by default. With `slidesPerView > 1`, this means the `.is-active` class lands on the leftmost visible slide, not the visually-centered one.

**For visually-centered active slides**, pass `:centered="true"`:

```vue
<Slider :slides-per-view="3" :centered="true" :items="items">…</Slider>
```

The component applies `margin-left: calc(50% - var(--slide-w) / 2)` to the wrapper. Slide 0 sits in viewport center; smooothy's `currentSlide` already matches the visually-centered slide (no JS offset needed).

**Why `margin-left`, not `transform: translateX`?** `transform` on the wrapper creates a stacking context / compositor layer that interacts badly with page-level transforms (e.g., page transitions): symptoms include the wraparound slide vanishing mid-transition. `margin-left` is plain box-model — survives transforms on ancestors cleanly. (Pattern confirmed against smooothy's own demo source.)

## Wrap the slider section in `overflow-hidden`

Infinite-loop wraparound works by smooothy instantly teleporting slides from one end to the other (translate jump of N × itemWidth in a single frame). The teleport endpoints are off-screen, but if no ancestor clips, the slide's flight path is visible across the viewport.

```vue
<section class="overflow-hidden">
  <Slider :infinite="true" :centered="true" …>…</Slider>
  <!-- chrome here too -->
</section>
```

The `overflow-hidden` is on the SECTION, not the slider's wrapper. This clips the off-screen flight paths without hiding the legit wraparound slides that peek in from the sides (which sit inside the section's bounds).

## Mobile

The composable detects mobile via [utils/media.js#isMobile](../../app/utils/media.js) and applies softer tuning automatically — no per-instance flag needed:

| Param | Desktop | Mobile |
|---|---|---|
| `lerpFactor` | 0.3 | 0.18 |
| `snapStrength` | 0.1 | 0.18 |
| `virtualScroll.touchMultiplier` | 1.25 | 2.2 |

Override per-instance via the matching props if a specific slider needs different feel.

## WebGL hookup (opt-in, future)

Slider exposes `speed` and `progress` reactively. A future per-page `useDOMPlane` (see [webgl-dom-page](../webgl-dom-page/SKILL.md)) can subscribe and feed these into shader uniforms — playfight's pattern is to map `speed → uStrength` and `progress → uScrollProgress` for motion-blur / distortion effects driven by slider velocity. Not wired in the starter; one-liner when needed.

## Sanity section — deferred

There's no `slider` Sanity section in the starter. The schema shape depends on what's *inside* the slides (images? rich text? mixed product cards?) and locking it premature. When a real project needs CMS-driven slides:

1. Add a section schema in `studio/schemas/sections/slider.ts` (`items: array of object`).
2. Register it in `studio/schemas/index.ts` + `page.sections.of[]`.
3. Build `app/components/Sanity/SectionSlider.vue` that wraps `<Slider :items="props.items">`.
4. Register the new section in [CmsSections.vue](../../app/components/Sanity/CmsSections.vue) `SECTION_MAP`.

See [sanity](../sanity/SKILL.md) for the section-adding flow.

## Gotchas

- **Slides must be the wrapper's direct children.** Smooothy reads `wrapper.children` at construct time. Don't nest slides inside an inner `<div>` — break the layout. (The `<Slider>` component handles this correctly; only relevant if you use `useSmoothy` directly.)
- **`items` reactivity is shallow.** Smooothy initializes once at mount with the children present at that moment. Adding/removing items at runtime won't re-init. If a project needs reactive slides, key the entire `<Slider>` on items length to force remount: `<Slider :key="items.length" :items="items">`.
- **Wheel scroll over the slider area.** With `scrollInput: false` (default), only horizontal wheel deltas move a horizontal slider; vertical page scroll passes through to Lenis. If you flip `scrollInput: true`, the slider eats wheel events globally over its area.
- **Autoplay + accessibility.** Autoplay pauses on `pointerdown` and resumes on `pointerup`. Honor `prefers-reduced-motion` yourself if a project demands it — pass `autoplay="0"` when the media query matches.
- **Variable width + infinite.** Smooothy supports both, but `parallaxValues` semantics change (pixel offsets, not slide-unit). The `--slide-distance` math in your CSS may need re-tuning for variable-width layouts.

## Cross-references

- [scroll-anim](../scroll-anim/SKILL.md) — for scroll-pinned animations (different tool, different use case)
- [component](../component/SKILL.md) — Vue SFC conventions for new starter components
- [sanity](../sanity/SKILL.md) — when wrapping `<Slider>` in a CMS section
- [webgl-dom-page](../webgl-dom-page/SKILL.md) — when feeding slider state into shader uniforms

## Key files

- [app/components/UI/slider/Slider.vue](../../app/components/UI/slider/Slider.vue) — primary component
- [app/components/UI/slider/SliderArrow.vue](../../app/components/UI/slider/SliderArrow.vue) — default arrow chrome
- [app/components/UI/slider/SliderPagination.vue](../../app/components/UI/slider/SliderPagination.vue) — default dots chrome
- [app/composables/useSmoothy.js](../../app/composables/useSmoothy.js) — composable wrapping smooothy Core
- [app/pages/work.vue](../../app/pages/work.vue) — live demo
