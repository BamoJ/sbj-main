---
name: shader
description: Write and debug GLSL shaders for the WebGL layer. Use when creating new shader effects, modifying the shared vertex/fragment pair, adding uniforms, or writing GLSL includes.
user-invokable: true
---

# Shader — GLSL in the WebGL layer

## File structure

```
layers/webgl/shaders/
├── sharedVert.glsl            # Vertex shader used by useDOMPlane meshes
├── sharedFrag.glsl            # Fragment shader used by useDOMPlane meshes
└── includes/
    └── perlinNoise.glsl       # Reference copy (also inlined into sharedVert)
```

The placeholder mesh in [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js) uses two **inline** shader strings (`PLACEHOLDER_VERT` / `PLACEHOLDER_FRAG`) — not the `.glsl` files. The shared files are for `useDOMPlane`.

## Import system

GLSL files are imported via Vite's built-in `?raw` suffix (no plugin):

```js
import vertexShader from '@shaders/sharedVert.glsl?raw'
import fragmentShader from '@shaders/sharedFrag.glsl?raw'
```

The `@shaders` alias is set in [layers/webgl/nuxt.config.ts](layers/webgl/nuxt.config.ts). It resolves to `layers/webgl/shaders/`.

### `#include` directives — NOT supported

We don't use `vite-plugin-glsl` (1.6 had a double-wrap bug; 1.3 emits output Vite 7 treats as text). `?raw` returns the file as-is. **`#include "..."` lines are passed through to the GLSL compiler verbatim and will fail.**

To share code across shaders, inline it manually. `sharedVert.glsl` inlines the Perlin noise functions at the top of the file. The `includes/perlinNoise.glsl` file is kept as a reference copy you can paste into new shaders.

## Uniform conventions

Standard uniforms set by `useDOMPlane` ([layers/webgl/composables/useDOMPlane.js](layers/webgl/composables/useDOMPlane.js)):

| Uniform | Type | Set by | Purpose |
|---|---|---|---|
| `uTexture` | sampler2D | TextureCache | Image texture |
| `uTime` | float | per-frame from plugin clock | Accumulated time |
| `uStrength` | float | (currently 0; future: scroll velocity) | Vertex Z-distortion |
| `uScrollProgress` | float | (currently 0; future: scroll progress) | RGB shift driver |
| `uOpacity` | float | transition hooks | Alpha (0–1) |
| `uViewportSizes` | vec2 | plugin viewport | For viewport-relative effects |
| `uCoverScale` | vec2 | DOMPlane (aspect ratio) | object-fit: cover correction |
| `uMouse` | vec2 | (currently (0.5, 0.5); future: hover) | Bulge centre |
| `uBulge` | float | (currently 0; future: hover) | Bulge intensity |
| `uEntrance` | float | transition hooks | Paper-flutter entrance (1→0) |
| `uPageTransition` | float | transition hooks | Ripple progress (0→1→0) |
| `uRGBMul` | float | per-page option `rgbShift` | RGB shift multiplier |
| `uBlurMul` | float | per-page option `blur` | Motion blur multiplier |
| `uBulgeMul` | float | per-page option `bulge` | Bulge intensity multiplier |
| `uBulgeStrengthMul` | float | per-page option `bulgeStrength` | Bulge curve shape |

The placeholder mesh exposes its own minimal set:

| Uniform | Type | Purpose |
|---|---|---|
| `uTime` | float | Baseline bottom-edge wave |
| `uTransition` | float | Route-change radial pulse (0→1→0) |

### Adding a custom uniform to a DOMPlane mesh

```js
// In a page using useDOMPlane:
const { mesh } = useDOMPlane(heroEl, src)

watchEffect(() => {
  if (!mesh.value) return
  mesh.value.material.uniforms.uMyEffect = { value: 0 }
})
```

Then declare in the shader. Since we share `sharedVert.glsl` / `sharedFrag.glsl` across all DOMPlane users, adding a uniform there affects every page — so either:
- **Per-instance unique uniform name** + harmless default (`uniform float uMyEffect; void main() { ... gl_FragColor.rgb += uMyEffect * something; }`).
- **Fork the shader** — duplicate the .glsl files to `customVert.glsl` / `customFrag.glsl`, import those in your own composable instead of `useDOMPlane`.

## Shared vertex shader walkthrough

[sharedVert.glsl](layers/webgl/shaders/sharedVert.glsl):

1. **Z wave** — `sin(newPosition.y / uViewportSizes.y * PI) * -uStrength` on Z-axis. Wires up when `uStrength` is driven from scroll velocity (not yet wired in root code).
2. **Entrance flutter** (when `uEntrance > 0`) — paper-from-below: shifts Y, adds Z sine flutter, ripples across the plane surface.
3. **Page-transition ripple** (when `uPageTransition > 0`) — sin wave along X + Perlin noise on Z, intensity peaks at `sin(progress * PI)`.
4. Passes `vUv` to fragment.

## Shared fragment shader walkthrough

[sharedFrag.glsl](layers/webgl/shaders/sharedFrag.glsl):

1. **Cover UV correction** — `(vUv - 0.5) * uCoverScale + 0.5`.
2. **Bulge distortion** — `bulge()` function reads `uMouse`, `uBulge`, `uBulgeMul`, `uBulgeStrengthMul`. Quadratic curve, harmless at 0.
3. **RGB shift on Y** — channel offsets driven by `uStrength * uScrollProgress * 0.7 * uRGBMul`.
4. **Motion blur** — 8-sample vertical loop, gated by `blurAmount < 0.001` early-out. Multiplier is `uBlurMul`. Adds `uEntrance * 1.5` during entrance for extra haze.
5. **Output** — `vec4(finalColor, uOpacity)`.

## Writing a new shader

### Vertex template (raw plane, no `#include` needed)

```glsl
precision highp float;
uniform float uTime;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  // your vertex effects
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

### Fragment template

```glsl
precision highp float;
uniform sampler2D uTexture;
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  // your UV effects
  vec4 color = texture2D(uTexture, uv);
  gl_FragColor = vec4(color.rgb, color.a * uOpacity);
}
```

### Using a custom shader with a raw mesh

Bypass `useDOMPlane` if you don't want DOM-rect mapping:

```js
import { Mesh, PlaneGeometry, ShaderMaterial } from 'three'
import vertexShader from './myVert.glsl?raw'
import fragmentShader from './myFrag.glsl?raw'

const { scene, viewport } = useCanvas()
const geometry = new PlaneGeometry(viewport.width, viewport.height)
const material = new ShaderMaterial({
  vertexShader,
  fragmentShader,
  transparent: true,
  uniforms: {
    uTime: { value: 0 },
    uOpacity: { value: 1 },
  },
})
const mesh = new Mesh(geometry, material)
scene.add(mesh)
```

### Using a custom shader through `useDOMPlane` (forked DOMPlane)

If you want DOM mapping but distinct shaders, fork the composable rather than mutating the shared one. Copy `useDOMPlane.js` to e.g. `useTrailPlane.js`, swap the shader imports, expose the new uniforms.

## 60fps rules

1. **Minimise `texture2D()` calls** — each is expensive. The shared frag does up to 11 in the worst case (3 sharp RGB + 8 blur). Don't add more without an early-out gate.
2. **`precision highp float`** — used in our shaders because the bulge math + scroll wave need it. Downgrading to `mediump` causes visible banding on the entrance wave. Don't change.
3. **Avoid branching** — `if/else` kills GPU parallelism. Use `step()`, `smoothstep()`, `mix()`. The shared frag has one acceptable exception: the `blurAmount < 0.001` early-out is a hot perf gate.
4. **Limit per-fragment math** — move what you can to the vertex shader. Varyings interpolate for free.
5. **UV-only effects** — distortions that only modify UV before a single texture lookup are far cheaper than multi-sample effects.
6. **Inline includes** — `?raw` doesn't process `#include`. Paste shared code in. Perlin noise is ~80 lines inlined into `sharedVert.glsl` — keep that pattern.
7. **Cheaper randomness** — if you just need pseudo-noise (not Perlin), use a hash:
   ```glsl
   float hash(vec2 p) {
     return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
   }
   ```

## Debugging shaders

1. **Compile errors** — Three.js prints the full shader source with line numbers in the console. The first error is usually the real one; later errors cascade.
2. **Visual debug** — output a value as colour:
   ```glsl
   gl_FragColor = vec4(vUv, 0.0, 1.0);              // UV as red-green gradient
   gl_FragColor = vec4(vec3(uTransition), 1.0);      // transition as grayscale
   ```
3. **Uniform not updating** — set `mesh.material.uniforms.uName.value`, not `mesh.material.uniforms.uName`.
4. **Black screen** — texture didn't load. Check TextureCache, image src, CORS.
5. **`renderer.properties.get(material).programs[0].diagnostics`** — Three.js stores compile diagnostics there (vertexShader.log, fragmentShader.log). Useful when the console error is truncated.

## Cross-browser

- **Safari / iOS**: WebGL 1 syntax only on older devices. Use `texture2D`, `gl_FragColor`, `attribute`, `varying`. Avoid WebGL2-only `texture()` / `out` variables.
- **Firefox**: Stricter GLSL validation. Always declare precision. No undeclared variables, even in dead code paths.
- **Mobile (Adreno, Mali)**: Cap texture samples under 4 per fragment when possible. Avoid `pow()`.

## Key files

- [layers/webgl/shaders/sharedVert.glsl](layers/webgl/shaders/sharedVert.glsl)
- [layers/webgl/shaders/sharedFrag.glsl](layers/webgl/shaders/sharedFrag.glsl)
- [layers/webgl/shaders/includes/perlinNoise.glsl](layers/webgl/shaders/includes/perlinNoise.glsl) — reference copy (inlined into sharedVert)
- [layers/webgl/composables/useDOMPlane.js](layers/webgl/composables/useDOMPlane.js) — where ShaderMaterial is created with the shared shaders
- [layers/webgl/plugins/webgl.client.js](layers/webgl/plugins/webgl.client.js) — placeholder mesh's inline shaders (`PLACEHOLDER_VERT` / `PLACEHOLDER_FRAG`)
- [layers/webgl/nuxt.config.ts](layers/webgl/nuxt.config.ts) — `@shaders` alias
