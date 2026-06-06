// Nuxt layer config for the WebGL system. Root project's nuxt.config.ts
// activates this layer via `extends: ['layers/webgl']`. Disabling the layer
// removes Three.js + the canvas pipeline from the bundle entirely.
//
// GLSL is imported with Vite's built-in `?raw` suffix (no vite-plugin-glsl:
// 1.6.x had a double-wrap parse error and 1.3.x emits output Vite 7 treats as
// raw text). Shaders live beside their view (canvas/<Name>/<name>shaders/) and
// are imported by relative path, so no alias is needed.
export default defineNuxtConfig({
  vite: {
    // Pre-bundle gsap (it's in the boot path) so cold-start `bun dev` doesn't
    // re-optimize on first page hit. `three` is deliberately NOT here: it's
    // dynamically imported (see plugins/webgl.client.js → ensure()) so it splits
    // into its own chunk and stays out of the entry bundle.
    optimizeDeps: {
      include: ['gsap'],
    },
  },
})
