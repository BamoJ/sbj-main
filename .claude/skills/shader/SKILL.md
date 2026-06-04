---
name: shader
description: Write and debug GLSL shaders for the WebGL layer. Shaders live per-view (no shared pair); the current home view also runs a GPU ping-pong simulation. Use when creating shader effects, adding uniforms, or debugging GLSL compile/runtime issues.
user-invokable: true
---

# Shader — GLSL in the WebGL layer

Shaders belong to a **view**, not the layer. There's no shared vertex/fragment pair —
each `Page` view ships its own `.glsl` files beside it. See
[webgl-canvas](../webgl-canvas/SKILL.md) for the engine.

## File structure (current: the Home view)

```
layers/webgl/canvas/Home/homeshaders/
├── sim.frag.glsl       # GPU physics — one ping-pong pass per frame (in Simulation.js)
├── render.vert.glsl    # samples the sim's position texture → clip space
└── render.frag.glsl    # draws each particle as a soft point (uAlpha for opacity)
```

A new view puts its shaders under `canvas/<View>/<view>shaders/` (or inline strings for
something tiny). The old `layers/webgl/shaders/` shared pair and the `@shaders` alias are
**gone**.

## Import system

GLSL is imported with Vite's built-in `?raw` suffix (no plugin), by **relative path**:

```js
import simFrag    from './homeshaders/sim.frag.glsl?raw'
import renderVert from './homeshaders/render.vert.glsl?raw'
import renderFrag from './homeshaders/render.frag.glsl?raw'
```

### `#include` — NOT supported
`?raw` returns the file verbatim; `#include "..."` lines reach the GLSL compiler and
fail. **Inline shared code by hand.** Example: `sim.frag.glsl` inlines a ~20-line 2D
simplex noise at the top rather than including it.

## The current Home shaders (orientation, not deep internals)

The Home view is a temporary GPU particle logo (its tuning lives in the `config` block of
`canvas/Home/home.js`; the GPU loop is `canvas/Home/Simulation.js`). Two stages:

- **Simulation** (`sim.frag.glsl`, run by `Simulation.js`): a fullscreen pass over a float
  texture where each texel = one particle (RGBA = `posX,posY,velX,velY`). It reads the
  previous state + an origin texture and writes the next — mouse repulsion + curl-noise
  flow + return-to-origin + a displacement clamp. Ping-ponged between two
  `WebGLRenderTarget`s. **Needs WebGL2 float render targets** (`EXT_color_buffer_float`;
  HalfFloat fallback in `Simulation.js`).
- **Render** (`render.vert.glsl` + `render.frag.glsl`): a `THREE.Points` whose vertex
  shader samples the sim's position texture (via a per-particle `ref` UV attribute) and
  projects pixel→clip; the fragment shader draws a soft round point at `uAlpha` opacity.

Render uniforms: `uPosition` (sim texture), `uColor`, `u_resolution`, `u_scale`,
`u_pointSize`, `uAlpha`. Don't treat these as a layer-wide convention — they're this
view's.

## Writing a shader for a new view

In the view's `createMaterials()`:

```js
import vert from './<view>shaders/vertex.glsl?raw'
import frag from './<view>shaders/fragment.glsl?raw'

this.material = new THREE.ShaderMaterial({
  vertexShader: vert,
  fragmentShader: frag,
  transparent: true,
  uniforms: { uTime: { value: 0 }, /* … */ },
})
```

Drive uniforms in the view's `update(time)` (`time.seconds`, `time.delta`). For a
GPU-simulation-style effect (particles, flow, fluid), copy the `Simulation.js` ping-pong
pattern rather than re-deriving it.

### Templates
```glsl
// vertex
precision highp float;
uniform float uTime;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```
```glsl
// fragment
precision highp float;
uniform sampler2D uTexture;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(texture2D(uTexture, vUv).rgb, uOpacity);
}
```

## 60fps rules
1. Minimise `texture2D()` calls — each is expensive; gate multi-sample loops with an
   early-out.
2. `precision highp float` — the sim's pixel-space positions need it; `mediump` bands/
   quantises. Keep highp.
3. Avoid `if/else` in hot fragment paths — prefer `step`/`smoothstep`/`mix`. (A coherent
   uniform branch like `if (uFlowStrength > 0.0)` is fine — all texels take one path.)
4. Move per-fragment math to the vertex shader where possible; varyings interpolate free.
5. Inline includes — `?raw` doesn't process `#include`.
6. Cheap pseudo-noise if you don't need simplex:
   ```glsl
   float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
   ```

## Debugging shaders
1. **Compile errors** — Three prints the full source with line numbers; the first error is
   usually the real one.
2. **Visual debug** — output a value as colour: `gl_FragColor = vec4(vUv, 0.0, 1.0);`.
3. **Uniform not updating** — set `material.uniforms.uName.value`, not `…uName`.
4. **Black / nothing** — for the Home sim: float render targets unsupported (check the
   `Simulation.js` HalfFloat fallback warning), or the source logo image is transparent/
   missing (no particles). For a textured view: texture didn't load (src/CORS).
5. `renderer.getContext().getExtension('EXT_color_buffer_float')` — null ⇒ float FBOs
   unavailable (the sim falls back to HalfFloat, with precision loss past ~2048px).

## Cross-browser
- The engine runs on **WebGL2** (Three default) and the Home sim requires WebGL2 float
  textures. Don't assume WebGL1.
- **Firefox**: strict GLSL validation — always declare precision; no undeclared vars even
  in dead paths.
- **Mobile**: the whole layer is disabled on touch anyway (see
  [webgl-toggle](../webgl-toggle/SKILL.md)), so shaders effectively target desktop GPUs.

## Key files
- [layers/webgl/canvas/Home/homeshaders/sim.frag.glsl](layers/webgl/canvas/Home/homeshaders/sim.frag.glsl)
- [layers/webgl/canvas/Home/homeshaders/render.vert.glsl](layers/webgl/canvas/Home/homeshaders/render.vert.glsl)
- [layers/webgl/canvas/Home/homeshaders/render.frag.glsl](layers/webgl/canvas/Home/homeshaders/render.frag.glsl)
- [layers/webgl/canvas/Home/Simulation.js](layers/webgl/canvas/Home/Simulation.js) — the ping-pong GPU loop
- [layers/webgl/canvas/Home/home.js](layers/webgl/canvas/Home/home.js) — view + `config` knobs
