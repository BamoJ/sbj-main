---
name: webgl-canvas
description: The WebGL layer's architecture — a small class-based Canvas/Page engine (ported from the sbj lab) with a route→view registry, one shared scene/camera/render loop, and a reactive desktop↔mobile switch. Read this first when touching WebGL or building any new view. The engine is the durable part; individual views (the current home particle logo included) are disposable.
user-invokable: true
---

# WebGL canvas — the Canvas/Page engine

`layers/webgl/` is a **small, reusable class engine ported from the lab**
(`sbj-starter-main/src/canvas/`). One persistent canvas, one `THREE.Scene`, one
`PerspectiveCamera`, one render loop. Routes map to **`Page` views** that get swapped
in/out. **The engine is the durable part; views are disposable** — build whatever each
page needs against the same `Page` contract and register it.

> This replaced an older **composable** system (`useDOMPlane`/`useWebGLPage`/
> `usePageTransition`) — those are gone. A class-based **DOMPlane** toolkit + cross-page
> plane-flight (`TransitionController`) are now ported but **dormant** (used opt-in via data
> attributes when a page needs them) — see [dom-plane](../dom-plane/SKILL.md) +
> [transition](../transition/SKILL.md).

## Mental model

A permanent **stage**: the engine boots once and lives for the whole site. A page brings
a **view** onto the shared scene on enter, disposes it on leave. The loop never stops;
only the contents swap.

```
gsap.ticker ──► time.tick() ──► trigger('tick') ──► Canvas.update()
                                                       ├─ currentPage.update(time)   // this view's frame work
                                                       └─ renderer.render(scene, cam) // one pass, one scene
```

## File map

```
layers/webgl/
├─ canvas/
│  ├─ index.js          # Canvas — renderer · scene · camera · Time · registry · onChange · mount · setRenderActive
│  ├─ Page.js           # base VIEW class (extends EventEmitter): an elements Group + the lifecycle below
│  ├─ registry.js       # { home: Home }  ← route name → view class (add views here)
│  ├─ utils/
│  │  ├─ Time.js        # frame clock (gsap.ticker-driven, emits 'tick'); ms, `.seconds` getter
│  │  └─ EventEmitter.js# namespaced on/off/trigger (Page + Time extend it)
│  ├─ DOMPlane.js       # DORMANT toolkit: DOM element → textured plane (a Page composes it)
│  ├─ TransitionController.js # DORMANT: cross-page plane flight (`$webgl.transition`)
│  ├─ shaders/          # DORMANT: default DOMPlane shaders (defaultVert/Frag + perlin)
│  └─ <View>/           # one folder per view. Current: Home/ (a TEMPORARY GPU particle logo)
├─ utils/TextureCache.js     # url-keyed texture loader (for views that load textures)
├─ plugins/webgl.client.js   # boots Canvas, capability gate, reactive `activeRef`, gsap.ticker
├─ components/WebGLCanvas.vue # the <canvas> container; lazy-build + v-show + pause/resume
└─ composables/useWebGL.js    # accessor → nuxtApp.$webgl  (the Canvas instance, or a disabled stub)
```

App side: `app/app.vue` mounts `<WebGLCanvas/>` + binds `<NuxtPage :transition>`;
`app/transitions/pageTransition.js` drives swaps ([transition](../transition/SKILL.md));
`app/pages/index.vue` shows a static BG when WebGL isn't active.

## Canvas (the engine) — `canvas/index.js`

- Constructor builds `scene`, `camera` (FOV 45, `z=1`), `Time`, and subscribes
  `time.on('tick', () => this.update())`. Renderer is created later.
- `mount(container)` — creates the `WebGLRenderer`, appends it, adds the resize listener.
  Called by `WebGLCanvas.vue`.
- `onChange(name, data)` — the swap: `registry[name]` → lazily `new Cls({ scene, camera,
  renderer, time })` → first visit `await load()` + `create()` → `prev.onLeave()` →
  `currentPage = next` → `next.onEnter(data)`.
- `update()` — early-returns unless `renderer && renderActive`; else `currentPage.update(time)`
  + render.
- `setRenderActive(v)` — pause/resume the loop (the responsive switch).

## The Page contract (what every view implements) — `canvas/Page.js`

A view extends `Page` and gets `{ scene, camera, renderer, time }` + a `this.elements`
`THREE.Group` (added to the shared scene). Override what you need:

| hook | when | typical use |
|------|------|-------------|
| `async load()` | once, before create | fetch textures/models |
| `createGeometry/createMaterials/createMeshes()` | once, in `create()` | build into `this.elements` |
| `onEnter(data)` / `onLeave(data)` | on route enter/leave | listeners, intro/outro |
| `update(time)` | every frame while active | animate (`time.seconds`, `time.delta`) |
| `onResize()` | on window resize | recompute sizes |
| `destroy()` | on teardown | base disposes the Group; add extras |

The base handles add-to-scene, visibility, `isActive`, and geometry/material disposal.

## Add a view (the one workflow to know)

1. `canvas/<Name>/<name>.js` extending `Page` — implement the hooks above. (Image-on-a-
   plane view? the [dom-plane](../dom-plane/SKILL.md) reference shows the texture/shader
   approach to port.)
2. Register it — one line in `canvas/registry.js`: `{ home: Home, work: Work }`.
3. Name the route: `definePageMeta({ name: 'work' })`. The transition's
   `onChange(route.name, el)` swaps to it. Engine + other views untouched.

The current `Home` view (a particle logo) is just an example occupant of this slot and
is expected to be replaced — don't treat its internals as part of the architecture.

## Responsive switch (desktop ↔ mobile) — `plugins/webgl.client.js`

- **Capability** (`prefersReducedMotion() || isTouch()`): true → a disabled stub `$webgl`
  (`enabled:false`, `activeRef: ref(false)`), no Three.js built. Fixed per device.
- **`activeRef`** — reactive `ref` on `matchMedia('(min-width: 768px)')`, flips on resize.
  `WebGLCanvas.vue` builds on first true (`mount` + `onChange`), then `setRenderActive` +
  `v-show` (context kept alive → instant). `index.vue` shows the static BG when `!activeRef`.

Disable / remove the layer entirely: [webgl-toggle](../webgl-toggle/SKILL.md).

## See also
- [canvas-nav](../canvas-nav/SKILL.md) — persistence across routes + `onChange` internals
- [transition](../transition/SKILL.md) — page transitions + planned cross-page plane flight
- [shader](../shader/SKILL.md) · [perf-audit](../perf-audit/SKILL.md) · [debug](../debug/SKILL.md)
- [dom-plane](../dom-plane/SKILL.md) — *reference only*: DOM→plane image pattern for a future project
