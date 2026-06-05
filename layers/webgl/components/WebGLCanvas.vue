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
const active = computed(() => webgl?.activeRef?.value ?? false)

let built = false
async function syncActive(on) {
  if (!webgl?.enabled || !container.value) return
  if (on && !built) {
    built = true
    webgl.mount(container.value)
    // onChange resolves after the view's load() (rasterize PNG) + sim build —
    // i.e. the particles are ready. The preloader's tracker waits on this.
    await webgl.onChange(route.name)
    emitter.emit('webgl:ready')
  }
  webgl.setRenderActive?.(on)
}

onMounted(() => syncActive(active.value))
watch(active, syncActive)

onBeforeUnmount(() => {
  if (!webgl?.enabled) return
  webgl.unmount?.()
})
</script>

<template>
  <div
    v-show="active"
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
