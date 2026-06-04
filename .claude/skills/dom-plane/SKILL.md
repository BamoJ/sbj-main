---
name: dom-plane
description: Map a DOM element to a WebGL plane via the DOMPlane helper (image-driven effects — depth parallax, RGB shift on mouse velocity, hover, reveal). Shipped as a toolkit but DORMANT — used inside a Page subclass when a page opts in via [data-gl="img"]. Read when building an image-plane page.
user-invokable: true
---

# DOMPlane — DOM element → WebGL plane (toolkit)

`layers/webgl/canvas/DOMPlane.js` is a **helper class**, ported from the lab. It maps a DOM
element's rect to a textured plane and keeps it glued (per-frame sync) with shader effects
(depth parallax + RGB shift driven by mouse velocity, hover, reveal). It uses the shared
`canvas/shaders/defaultVert.glsl` + `defaultFrag.glsl`.

> **Status: present but dormant.** Nothing imports it yet — no current page uses image
> planes. It's a toolkit a future page composes. (Earlier this skill documented a removed
> `useDOMPlane` *composable*; that's gone. `DOMPlane` is now a plain class.) See
> [webgl-canvas](../webgl-canvas/SKILL.md) for the architecture.

## It's a helper, not a view

Per the page-based architecture, image planes live **inside a `Page` subclass** — the way
the lab's `Home` page composed a `HomeView extends DOMPlane`. There is no "DOMPlaneView" or
registry entry for it. A page that wants planes `new DOMPlane(...)` and drives it.

## Data-attribute contract

A consuming page reads these from its own DOM:
- `[data-gl="img"]` on an `<img>` (or wrapper) → becomes a plane (the source `<img>` is hidden).
- `[data-gl-container]` around the link → hover area + click stages a cross-page flight.
- `[data-gl-target]` on the **destination** page's element → where a flying plane lands
  (see [transition](../transition/SKILL.md)).

## How a future page uses it

```js
// layers/webgl/canvas/Work/work.js
import { Page } from '../Page'
import { DOMPlane } from '../DOMPlane'
import { textureCache } from '../../utils/TextureCache'

export class Work extends Page {
  create() {
    this.dom = new DOMPlane({ parent: this.elements, camera: this.camera })
    document.querySelectorAll('[data-gl="img"]').forEach(async (el, i) => {
      const src = el.dataset.glSrc || el.currentSrc || el.src
      const texture = await textureCache.load(src)
      const mesh = this.dom.createPlane(texture, el, i)
      el.style.visibility = 'hidden'
      this.dom.setupHoverListeners(mesh, el, '[data-gl-container]')
      // optional: wire the flight — on link click, emit `webgl:transition:prepare`
      // with { mesh } (see transition skill).
    })
  }
  update(time) { this.dom?.update(time.delta) }
  onResize() { this.dom?.onResize() }
  destroy() { this.dom?.destroy(); super.destroy() }
}
```
Register it: `{ home: Home, work: Work }` in `canvas/registry.js`, and
`definePageMeta({ name: 'work' })` on the page.

## Shaders / uniforms (`canvas/shaders/default*.glsl`)
- Vertex: `uOffset` (drag skew), `uReveal` (0→1 reveal/scale), `uPageTransition` (paper
  ripple + perlin during a flight), `uTime`.
- Fragment: `uTexture`, `uOpacity`, `uMouseVelocity` (depth parallax + RGB shift).
`DOMPlane.createPlane` sets all of these; `update()` drives `uOffset`/`uMouseVelocity` from
hover velocity.

## Gating
Only run on desktop with WebGL active — guard the scan with `$webgl.enabled &&
$webgl.activeRef?.value`; otherwise leave the source `<img>`s visible (the DOM is the
fallback). Consistent with the rest of the layer ([webgl-toggle](../webgl-toggle/SKILL.md)).

## See also
- [transition](../transition/SKILL.md) — the cross-page plane flight that uses these planes
- [webgl-canvas](../webgl-canvas/SKILL.md) — architecture + how a view registers
- [webgl-dom-page](../webgl-dom-page/SKILL.md) / [webgl-page](../webgl-page/SKILL.md) — old
  composable API, kept as history (not the current `DOMPlane` class)
