<script setup>
// Mounts the persistent <canvas> the renderer draws into. Lives once in the
// app shell (app.vue) so the GL context survives <NuxtPage> route changes.
// On mobile (or when the plugin disabled itself), this becomes a no-op:
// the <canvas> still renders but the plugin never attaches a renderer.
const canvasEl = ref(null)
const { enabled, mount, unmount } = useCanvas()

onMounted(() => {
  if (!enabled || !canvasEl.value) return
  mount(canvasEl.value)
})

onBeforeUnmount(() => {
  if (!enabled) return
  unmount()
})
</script>

<template>
  <canvas
    ref="canvasEl"
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
</style>
