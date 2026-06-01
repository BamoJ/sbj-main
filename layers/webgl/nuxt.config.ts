import { fileURLToPath } from 'node:url'

// Nuxt layer config for the WebGL system. Root project's nuxt.config.ts
// activates this layer via `extends: ['layers/webgl']`. Disabling the layer
// removes Three.js + the shader pipeline from the bundle entirely.
//
// No vite-plugin-glsl: 1.6.x had a double-wrap parse error and 1.3.x emits
// output that Vite 7 treats as raw text. We use Vite's built-in `?raw` import
// suffix instead. Trade-off: GLSL `#include` directives must be inlined by
// hand (we did this for `perlinNoise.glsl` inside `sharedVert.glsl`).
export default defineNuxtConfig({
  alias: {
    '@shaders': fileURLToPath(new URL('./shaders', import.meta.url)),
  },

  vite: {
    // Pre-bundle three + gsap so cold-start `bun dev` doesn't trigger a
    // re-optimize on first page hit (Vite warns about this otherwise).
    optimizeDeps: {
      include: ['three', 'gsap'],
    },
  },
})
