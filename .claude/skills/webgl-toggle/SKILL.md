---
name: webgl-toggle
description: Enable or disable the WebGL layer in this starter. The placeholder mesh ships ON by default; this skill documents the manual procedure to turn it off (and back on later) without touching the layer's internals.
user-invokable: true
---

# WebGL toggle — turn the layer on or off

## Default state (no work)

WebGL is **ON**. The setup that ships with this starter:

- [nuxt.config.ts](nuxt.config.ts) has `extends: ['layers/webgl']`
- [app/app.vue](app/app.vue) renders `<WebGLCanvas />` inside `<Theme>`
- [app/transitions/pageTransition.js](app/transitions/pageTransition.js) calls `usePageTransition().prepareTransition()` (onLeave) and `usePageTransition().enterTransition(delay)` (onEnter)
- [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js) creates a persistent placeholder mesh — subtle bottom-edge wave at rest, full-screen radial pulse during route transitions
- Pages have **zero WebGL code** — the canvas is alive and reacts to transitions without any opt-in

If a page wants its own image-driven WebGL effects, opt in via `useDOMPlane` per page (see [webgl-dom-page](../webgl-dom-page/SKILL.md)). DOMPlane is opt-in per page; doesn't require toggling the whole layer.

## Turning WebGL OFF

Four manual edits — this is the intended workflow. No script, no flag, no branch. Pages already have zero WebGL code, so there's nothing to undo there.

### 1. Remove the layer extension

[nuxt.config.ts](nuxt.config.ts):

```ts
// extends: ['layers/webgl'],   ← delete or comment out
```

### 2. Remove the canvas component

[app/app.vue](app/app.vue) — delete the `<WebGLCanvas />` line and its comment:

```diff
 <template>
   <Theme class="u-theme-dark">
-    <!-- Persistent WebGL canvas from layers/webgl/ ... -->
-    <WebGLCanvas />
     <MainNav />
     <main>
       <NuxtPage :transition="pageTransition" />
     </main>
   </Theme>
   <GridGuide />
 </template>
```

### 3. Remove the transition hooks

[app/transitions/pageTransition.js](app/transitions/pageTransition.js):

- In `onLeave`, delete the `usePageTransition().prepareTransition()` line.
- In `onEnter` (near the end, after the gsap timeline calls), delete the `usePageTransition().enterTransition(delay)` line.

Keep the two `emitter.emit('transition:start' | 'transition:complete')` calls — useful signals regardless of WebGL.

### 4. (Optional) Remove the layer folder + three.js

```bash
rm -rf layers/webgl
bun install   # drops three from node_modules
```

### Result

Pure GSAP / Lenis / Sanity Nuxt starter. No three.js in the bundle. Transitions still work — they just don't have the WebGL pulse.

If a project later adds `useDOMPlane` calls to specific pages, those calls + their wrapper divs also need removing during step 4. The default starter doesn't have any, so this only applies to projects that opted in.

## Turning WebGL back ON

If you turned it off earlier and want it back:

1. Restore `extends: ['layers/webgl']` in [nuxt.config.ts](nuxt.config.ts).
2. Restore `<WebGLCanvas />` in [app/app.vue](app/app.vue) (inside `<Theme>`, before `<MainNav />`).
3. Restore the two `usePageTransition()` calls in [pageTransition.js](app/transitions/pageTransition.js):
   - `onLeave`: `usePageTransition().prepareTransition()`
   - `onEnter`: `usePageTransition().enterTransition(delay)` at the end
4. If you deleted `layers/webgl/`, restore from git history or copy from the starter again.
5. `bun install` to pick up `three`.

## Mobile bypass (automatic — no toggle needed)

The plugin checks `isMobile()` at boot. Viewport `≤ 768px` skips Three.js entirely — no scene, no renderer, no RAF subscriptions. The toggle above is for the desktop default. Mobile bypass is automatic regardless of toggle state.

## Manual removal only — no script

There is **no** `bun run disable-webgl` script and none is planned. The four edits above are the entire procedure; the touch points are small and stable, so a script would be overhead without payoff. If a future project needs WebGL off, follow the steps above manually and commit the result.

## Cross-references

- [new-project](../new-project/SKILL.md) — when to make the on/off decision during scaffolding
- [transition](../transition/SKILL.md) — what the on-state does during route changes
- [dom-plane](../dom-plane/SKILL.md) — opt-in per-page DOMPlane usage (separate concept from the layer toggle)
- [canvas-nav](../canvas-nav/SKILL.md) — what stays in the scene with the layer enabled
