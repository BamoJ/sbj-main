---
name: webgl-multipage
description: How WebGL is organized across multiple pages (home/about/contact) when one page is an image-on-a-plane, another is raw 3D, and one page is both. The mental model (one canvas, one scene, one pass), the per-page experience-composable convention, and the future paths for independent cameras and shared-element transitions. Read before adding WebGL to a second page or designing a mixed plane+3D page.
user-invokable: true
---

# WebGL across multiple pages

The question this answers: if the site grows to **home / about / contact** — where
one page is an image mapped to a plane, another is a raw 3D scene, and one page has
**both** — what does the WebGL look like, and how do you keep it clean across route
changes?

Short answer: **you don't make one canvas per experience. There is one canvas, one
`Scene`, one camera, one render pass. "Experiences" are meshes you add to that one
scene; pages add theirs on mount and dispose on unmount.** This skill gives the model
and the convention that keeps it tidy.

> This system was ported from the in-house vanilla-JS starter
> [`github.com/BamoJ/sbj-starter-main`](https://github.com/BamoJ/sbj-starter-main)
> (`src/canvas/`). That original is the best worked example of the multi-page model —
> this skill maps its ideas onto the Nuxt layer and notes what the port kept vs
> simplified.

## 1. The core model

One persistent canvas lives in `app/app.vue` **outside** `<NuxtPage>`, so it survives
route changes (see [canvas-nav](../canvas-nav/SKILL.md)). The plugin
[`layers/webgl/plugins/webgl.client.js`](../../../layers/webgl/plugins/webgl.client.js)
owns the single `Scene`, `PerspectiveCamera` (FOV 45, `z=1`), the `Time` clock, and
one render pass driven off the shared `gsap.ticker`:

```
gsap.ticker (one RAF for the whole app)
 ├─ Lenis.raf()      → scroll + ScrollTrigger.update()   (app/composables/useLenis.js)
 └─ webgl tickerCallback
      ├─ time.tick()                       // advances the Time clock
      ├─ placeholder.uTime = time.seconds
      ├─ emitter.emit('webgl:tick', …)
      ├─ pages.forEach(p => p.update(time)) // per-page custom frame work
      └─ renderer.render(scene, camera)     // ONE pass, ONE scene
```

Two opt-in primitives a page contributes with:

- **`useDOMPlane(ref, url, opts)`** ([webgl-dom-page](../webgl-dom-page/SKILL.md)) —
  glues a Three plane to a DOM element's rect, re-synced every frame, with the shared
  scroll/RGB/blur/bulge shader. **This is "a plane."**
- **`useWebGLPage(name)`** ([webgl-page](../webgl-page/SKILL.md)) →
  `handle.update = (time) => {…}` — a per-frame hook into the shared loop where the
  page adds its **own** geometry to `$webgl.scene`. **This is "a 3D experience."**

Both no-op on mobile / layer-off, and both clean themselves up on unmount.
[`usePageTransition`](../transition/SKILL.md) animates every registered mesh during
route swaps; the placeholder mesh always persists.

## 2. What each page looks like

| Page | Calls | Why |
|------|-------|-----|
| **Plane page** (e.g. contact) | `useDOMPlane()` × N | Image(s) with shader effects, no custom loop |
| **3D page** (e.g. about) | `useWebGLPage('about')` + add geometry to `$webgl.scene` | A particle field / 3D hero; drive it in `handle.update` |
| **Mixed page** (e.g. home) | **both** — `useDOMPlane()` *and* `useWebGLPage('home')` | Hero image plane *plus* a 3D element |

The mixed case needs nothing special: the plane mesh and the 3D meshes coexist in the
one scene and are drawn in the same pass. This is exactly how the prior art's `Home`
page worked — a `HomeView extends DOMPlane` that could equally hold raw 3D in its
`elements` group. The original `Page.js` says it outright:

> *"For pages that need DOM-mapped WebGL planes, use DOMPlane as a helper. For pages
> with raw 3D scenes (particles, etc.), work with this.scene directly."*

## 3. The convention: a per-page experience composable (do this)

**Don't call `useDOMPlane`/`useWebGLPage` directly from a page SFC.** Wrap each page's
WebGL in its own composable that owns that page's meshes and disposal:

```
app/composables/useHomeWebGL.js     // hero plane + 3D bit
app/composables/useAboutWebGL.js    // pure 3D
app/composables/useContactWebGL.js  // pure plane
```

```js
// app/composables/useHomeWebGL.js
export function useHomeWebGL(heroRef) {
  const { handle } = useWebGLPage('home')          // custom 3D
  const { mesh }   = useDOMPlane(heroRef, '/images/texture.png')  // the plane
  // own per-frame logic, raycaster, etc. here via handle.update
  return { mesh }
}
```

```vue
<!-- app/pages/index.vue -->
<script setup>
const hero = ref(null)
useHomeWebGL(hero)   // page stays clean
</script>
```

**This composable is the Nuxt equivalent of the prior art's `Page` subclass** — it
re-introduces the structured per-page unit (the original had `Page` +
`create/transitionIn/destroy`; the Nuxt port dropped it in favour of bare
composables). Keeping that unit back is what makes the page readable and the cleanup
deterministic.

**The one import rule that matters:** *page SFCs import experience composables only;
only experience composables import `useDOMPlane`/`useWebGLPage`.* That single boundary
is what makes the §4 "swap to render-to-texture later" change free — it stays internal
to one composable; pages, transitions, and the layer API don't move.

## 4. Cameras — shared now, independent later

Everything above assumes the **shared camera is fine**: 3D content sits in the same
frustum as the planes (object near `z=0`, scaled). That holds for most portfolio 3D.

It breaks when a page needs its **own** camera motion (orbit/dolly), a different FOV,
or post-processing on just that experience — there is a single camera and a single
pass. Escalation paths, in recommended order:

1. **Render-to-texture (preferred).** The 3D experience renders to an FBO; that
   texture feeds a `useDOMPlane`. "Plane vs 3D" collapses into "static texture vs live
   texture" — same placement, same transitions, same shaders. The §3 convention makes
   this a one-composable change.
2. **Per-page camera swap.** Animate/replace the shared camera on the 3D page. Cheap;
   only works if one experience uses the 3D camera at a time.
3. **Second render pass.** Own `Scene` + `Camera`, `renderer.autoClear = false`,
   render over/under the DOM-plane scene. Most control, most wiring.

No layer changes are needed today — design page composables behind the §3 boundary and
RTT drops in when wanted.

## 5. Old → new mapping (what the port kept vs simplified)

| sbj-starter-main (class) | sbj-main (Nuxt layer) | Status |
|---|---|---|
| `Canvas` renderer/scene/camera/RAF | `plugins/webgl.client.js` (`$webgl`, `gsap.ticker`) | Kept |
| `Canvas` page registry + `onChange` lazy lifecycle | Nuxt routing + Vue mount/unmount of page SFCs | **Replaced** — no explicit registry/`Page` class |
| `Page` base (load/create/transitionIn/destroy) | `useWebGLPage(name)` → bare `handle.update` | **Simplified** — re-introduce via §3 convention |
| `DOMPlane` class (multi-plane view) | `useDOMPlane(ref, url)` (one plane/call) | Ported |
| `utils/Time.js` (Emitter clock, own RAF) | `layers/webgl/utils/Time.js` (Emitter clock, **gsap.ticker-driven**) | Ported — drives off the shared ticker instead of owning a RAF |
| `TransitionController.getFlightContext` (mesh flight) | `usePageTransition` (fade-all registered meshes) | **Simplified** — see §6 |

## 6. Known gap: shared-element mesh-flight transitions

The Nuxt `usePageTransition` only fades registered meshes during a route swap. The
prior art's `TransitionController` did geometry-agnostic **mesh flight** — a home
thumbnail mesh flying into the destination page's hero, authored on one GSAP timeline
(`prepare(mesh)` → destination calls `getFlightContext(rect)` → tween mesh transform +
uniforms + DOM together). Plane flights used `sizeProxy` + UV correction; 3D flights
tweened scale/rotation/uniforms.

If that effect is wanted, porting `TransitionController` is the path — a known, scoped
extension, independent of the per-page convention above.

## See also

- [webgl-page](../webgl-page/SKILL.md) — `useWebGLPage` details (custom 3D per page)
- [webgl-dom-page](../webgl-dom-page/SKILL.md) — `useDOMPlane` details (a plane)
- [canvas-nav](../canvas-nav/SKILL.md) — how the canvas survives route changes
- [transition](../transition/SKILL.md) — page transitions + the placeholder mesh
- [webgl-toggle](../webgl-toggle/SKILL.md) — turning the layer on/off
