---
name: scroll-anim
description: Build scroll-driven DOM animations with GSAP, ScrollTrigger, and SplitText. Use when adding reveal animations, parallax effects, text animations, or any scroll-triggered animation on DOM elements.
user-invokable: true
---

# Scroll animations — GSAP + ScrollTrigger + SplitText

## Architecture

The starter ships a small declarative animation system:

- **`[data-anim="<name>"]`** on any DOM element opts that element into a scroll animation.
- **`useAnims()`** ([app/composables/useAnims.js](app/composables/useAnims.js)) — called once per page in `<script setup>`. Scans the page root for `[data-anim]` elements, instantiates the matching class from the registry, manages lifecycle.
- **`REGISTRY`** ([app/animations/index.js](app/animations/index.js)) — maps the attribute value (`fade-in`, `heading`, `paragraph`) to a class.
- **`Animation`** base class ([app/animations/Animation.js](app/animations/Animation.js)) — common lifecycle: `setup() → activate() → destroy()`. Honours `prefers-reduced-motion`.
- **Subclasses** ([app/animations/effect/FadeIn.js](app/animations/effect/FadeIn.js), [text/HeadingReveal.js](app/animations/text/HeadingReveal.js), [text/ParaReveal.js](app/animations/text/ParaReveal.js)) — override hooks for the actual GSAP work.

`useLenis()` ([app/composables/useLenis.js](app/composables/useLenis.js)) already syncs Lenis ↔ ScrollTrigger via one `gsap.ticker` loop. No extra wiring needed.

## Using existing animations (declarative)

Drop `[data-anim]` on the element, call `useAnims()` in the page, done.

```vue
<script setup>
useAnims()
</script>

<template>
  <h1 data-anim="heading">Hero text</h1>
  <p data-anim="paragraph">Body copy</p>
  <img data-anim="fade-in" src="/hero.webp" alt="..." />
</template>
```

Built-in keys:

| Attribute | Class | Effect |
|---|---|---|
| `data-anim="fade-in"` | FadeIn | Opacity 0→1, y 24px → 0, 0.9s. Triggers at 85% viewport. |
| `data-anim="heading"` | HeadingReveal | SplitText chars, `yPercent: 110 → 0`, stagger. Fires immediately on mount (no scroll trigger). |
| `data-anim="paragraph"` | ParaReveal | SplitText lines, `yPercent: 100 → 0`, stagger 0.045s. Scroll-triggered. |

`HeadingReveal` is intended for the page hero — the page transition's SplitText choreography uses `[data-hero-title]` on the H1 directly, not `data-anim="heading"`. Use `data-anim="heading"` on secondary headings further down the page.

## The base class

[app/animations/Animation.js](app/animations/Animation.js):

```js
export class Animation {
  constructor(el, options = {}) {
    this.el = el
    this.options = options
    this.timeline = null
    this.scrollTrigger = null
    this.config = this.constructor.config ?? {}
  }

  setup() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    this.timeline = gsap.timeline({ paused: true })
    this.create?.()
  }

  activate() {
    if (!this.timeline) return
    if (this.config.scrollTrigger) {
      this.scrollTrigger = ScrollTrigger.create({
        trigger: this.el,
        start: this.config.start ?? 'top 85%',
        once: this.config.once ?? true,
        scrub: this.config.scrub ?? false,
        animation: this.timeline,
      })
    } else {
      this.timeline.play()
    }
  }

  destroy() {
    this.scrollTrigger?.kill()
    this.timeline?.kill()
    this.cleanup?.()
  }
}
```

Subclasses override `create()` (timeline construction) and optionally `cleanup()` (e.g., `SplitText.revert()`).

## Adding a new animation

### 1. Create the class

```js
// app/animations/effect/SlideUp.js
import gsap from 'gsap'
import { Animation } from '../Animation'

export class SlideUp extends Animation {
  static config = {
    scrollTrigger: true,
    start: 'top 85%',
    once: true,
  }

  create() {
    this.timeline.from(this.el, {
      yPercent: 30,
      autoAlpha: 0,
      duration: 1.0,
      ease: 'power3.out',
    })
  }
}
```

### 2. Register it

[app/animations/index.js](app/animations/index.js):

```js
import { FadeIn } from './effect/FadeIn'
import { SlideUp } from './effect/SlideUp'
import { HeadingReveal } from './text/HeadingReveal'
import { ParaReveal } from './text/ParaReveal'

export const REGISTRY = {
  'fade-in': FadeIn,
  'slide-up': SlideUp,
  heading: HeadingReveal,
  paragraph: ParaReveal,
}
```

### 3. Use it

```html
<div data-anim="slide-up">Animated content</div>
```

`useAnims()` picks it up automatically on mount, destroys on unmount.

## SplitText specifics

SplitText is part of GSAP 3.13+ (free since April 2025). Register once:

```js
import { SplitText } from 'gsap/SplitText'
gsap.registerPlugin(SplitText)
```

Already registered in [Animation.js](app/animations/Animation.js) and [pageTransition.js](app/transitions/pageTransition.js).

In a `create()` override:

```js
create() {
  this.split = new SplitText(this.el, {
    type: 'chars,lines',
    mask: 'lines',
    linesClass: 'line',
  })
  this.timeline.from(this.split.chars, {
    yPercent: 110,
    stagger: 0.025,
    duration: 0.65,
    ease: 'sine.out',
  })
}

cleanup() {
  this.split?.revert()
}
```

**`.line-mask`** is the wrapper SplitText inserts for `mask: 'lines'`. [base.css](app/assets/css/base.css) gives it `padding-right: 0.25em; padding-bottom: 0.02em` so the last character isn't clipped during the yPercent animation.

## Lifecycle around route changes

`useAnims()` instances are scoped to the component's lifetime:

- On mount → scan root for `[data-anim]`, instantiate, `setup()`, `activate()`.
- On unmount → call `destroy()` on each instance — kills ScrollTriggers + timelines + SplitText.revert.

Pages don't have to register animations manually. Just call `useAnims()` and drop the attributes. The page transition runs `ScrollTrigger.refresh()` at the end of `onEnter` so triggers cached during the page's pinned phase recalculate against the live layout.

## Custom easings

[app/utils/easings.js](app/utils/easings.js) — signature curves registered with `CustomEase`:

```js
export const easings = {
  linear: 'linear',
  lineEase: CustomEase.create('lineEase', 'M0,0 C0.602,0.01 -0.024,0.995 1,1'),
  paragraphEase: CustomEase.create('paragraphEase', 'M0,0 C0.38,0.005 0.1216,1.0005 1,1'),
  transitionEase: CustomEase.create('transitionEase', '.6,.11,.18,.99'),
  heading: CustomEase.create('heading', 'M0,0 C0.3851,0.0101 0.0884,0.9991 1,1'),
}
```

Use by name (CustomEase auto-registers): `ease: 'paragraphEase'`. Or import the object and reference: `ease: easings.heading`.

## 60fps rules

1. **`prefers-reduced-motion`** — base class skips animation setup entirely when the OS preference is set. Subclasses don't have to check.
2. **`once: true`** by default — most reveals fire once and don't need to keep evaluating.
3. **Width-only resize for SplitText** — re-splitting on every resize event is expensive and breaks during mobile address-bar show/hide. Guard with `if (window.innerWidth === prevWidth) return`.
4. **Mobile SplitText fallback** — `ParaReveal` checks `isTabletOrBelow()` ([app/utils/media.js](app/utils/media.js)) and falls back to simple opacity. Copy this pattern for any text animation that's expensive on touch devices.
5. **Stagger budget** — 50+ staggered elements cause frame drops on entry. Use `stagger: { amount: 0.3 }` (total time) instead of `stagger: { each: 0.05 }` (per-element) for large lists.
6. **`autoAlpha` over `opacity`** — sets `visibility: hidden` at 0, removing the element from the compositing tree.
7. **`gsap.ticker.lagSmoothing(0)`** is set globally in [useLenis.js](app/composables/useLenis.js). Don't change it.
8. **Avoid layout reads in `create()`** — don't call `getBoundingClientRect()` inside the timeline build. Read dimensions once and cache.
9. **Prefer transforms** — `x/y/scale/rotation` (GPU-composited). Avoid `width/height/top/left` (layout-triggering).

## Cross-browser

- **Safari**: ScrollTrigger pin + `position: fixed` can flicker. Use `pinType: 'transform'` if pinning.
- **Mobile Safari**: SplitText with `mask: 'lines'` can show anti-aliasing artifacts. Test on device.
- **Firefox**: text rendering differs slightly — line breaks via SplitText may shift one word; always test.
- **Low-end devices**: prefer the reduced-motion or mobile fallback paths.

## Key files

- [app/composables/useAnims.js](app/composables/useAnims.js)
- [app/animations/Animation.js](app/animations/Animation.js) — base class
- [app/animations/index.js](app/animations/index.js) — registry
- [app/animations/effect/FadeIn.js](app/animations/effect/FadeIn.js)
- [app/animations/text/HeadingReveal.js](app/animations/text/HeadingReveal.js)
- [app/animations/text/ParaReveal.js](app/animations/text/ParaReveal.js)
- [app/utils/easings.js](app/utils/easings.js)
- [app/composables/useLenis.js](app/composables/useLenis.js) — Lenis ↔ ScrollTrigger sync
- [app/utils/media.js](app/utils/media.js) — `isMobile()`, `prefersReducedMotion()`
