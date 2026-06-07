<script setup>
import { emitter } from '~/utils/Emitter'
// The persistent stage container. Lives once in app.vue so the GL context
// survives <NuxtPage> route changes.
//
// `activeRef` (viewport ≥ breakpoint) drives the live swap: the first time it's
// true we build the renderer + enter the page (once), then we just pause/resume
// rendering and show/hide the canvas via v-show as the viewport crosses the
// breakpoint — the GL context is kept alive so the swap is instant. On touch /
// reduced-motion `enabled` is false and this never builds (the home BG shows).
const container = ref(null)
const route = useRoute()
const webgl = useWebGL()
// Two SEPARATE gates, deliberately not combined:
//   • breakpointActive (viewport ≥ breakpoint) drives the one-time BUILD. The
//     build must NOT depend on tab visibility, or a page first loaded in a hidden
//     tab would never emit `webgl:ready` and the preloader would stall on it.
//   • renderable (breakpoint AND tab visible) drives setRenderActive — the live
//     pause/resume of the draw loop, so a hidden tab pays no GPU cost.
const breakpointActive = computed(() => webgl?.activeRef?.value ?? false)
const visible = computed(() => webgl?.visibleRef?.value ?? true)
const renderable = computed(() => breakpointActive.value && visible.value)

let built = false
async function build() {
  if (!webgl?.enabled || !container.value || built) return
  built = true
  // Lazily import three + build the Canvas here (first desktop activation) — this
  // is the seam that keeps three.js out of the boot bundle.
  await webgl.ensure?.()
  webgl.mount(container.value)
  // onChange resolves after the view's load() (rasterize PNG) + sim build — i.e.
  // the particles are ready. The preloader's tracker waits on this event; it fires
  // regardless of tab visibility, so the preloader never hangs in a background tab.
  await webgl.onChange(route.name)
  emitter.emit('webgl:ready')
  webgl.setRenderActive?.(renderable.value) // sync the render gate now the canvas exists
}

onMounted(() => { if (breakpointActive.value) build() })
watch(breakpointActive, (on) => { if (on) build() }) // first desktop crossing builds (once)
watch(renderable, (on) => webgl.setRenderActive?.(on)) // pause/resume on visibility + breakpoint

onBeforeUnmount(() => {
  if (!webgl?.enabled) return
  webgl.unmount?.()
})
</script>

<template>
  <div
    v-show="breakpointActive"
    ref="container"
    class="webgl-canvas"
    aria-hidden="true"
  />
</template>

<style scoped>
.webgl-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 0;
}

.webgl-canvas :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
