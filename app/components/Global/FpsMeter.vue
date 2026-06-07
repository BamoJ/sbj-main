<script setup>
import { gsap } from 'gsap'

// Dev-only perf overlay (mounted behind `import.meta.dev` in app.vue). Toggle with
// Shift+F. Built like GridGuide — self-contained, pointer-events-none, no stats.js.
//
// The headline line is "GL draws/s": it counts renderer.render() calls via
// renderer.info.render.frame, so it reads ~0 when the particle sim is asleep or the
// tab is hidden, and jumps to the display refresh while you interact — the live
// proof that render-on-demand is working. "fps" is the gsap.ticker/rAF rate, which
// stays at refresh even while GL sleeps (Lenis rides the same ticker).
const visible = ref(false)
const fps = ref(0)
const ms = ref(0)
const glFps = ref(0)
const calls = ref(0)
const points = ref(0)
const glOff = ref(false)

const { $webgl } = useNuxtApp()

let frames = 0
let last = 0
let lastGlFrame = 0

const sample = () => {
  frames++
  const now = performance.now()
  if (!last) {
    last = now
    return
  }
  const dt = now - last
  if (dt < 500) return // update ~2×/sec

  fps.value = Math.round((frames * 1000) / dt)
  ms.value = +(dt / frames).toFixed(1)

  if ($webgl?.enabled === false) {
    glOff.value = true
  } else {
    const info = $webgl?.renderer?.info?.render
    if (info) {
      glFps.value = Math.round(((info.frame - lastGlFrame) * 1000) / dt)
      lastGlFrame = info.frame
      calls.value = info.calls
      points.value = info.points
    }
  }

  frames = 0
  last = now
}

const fpsColor = computed(() =>
  fps.value >= 58 ? '#5cff8f' : fps.value >= 45 ? '#ffd23f' : '#ff5c5c',
)

const onKey = (e) => {
  const t = e.target
  if (
    t instanceof HTMLElement &&
    (t.matches('input, textarea, select') || t.isContentEditable)
  ) {
    return
  }
  // e.code is layout-independent (matches GridGuide's Shift+G convention).
  if (e.shiftKey && e.code === 'KeyF') {
    e.preventDefault()
    visible.value = !visible.value
  }
}

onMounted(() => {
  gsap.ticker.add(sample)
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  gsap.ticker.remove(sample)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div v-show="visible" aria-hidden="true" class="fps-meter">
    <div :style="{ color: fpsColor }">{{ fps }} fps · {{ ms }} ms</div>
    <div v-if="glOff">GL: off (static BG)</div>
    <template v-else>
      <div>GL: {{ glFps }} draws/s</div>
      <div>{{ calls }} calls · {{ points.toLocaleString() }} pts</div>
    </template>
    <div class="fps-hint">shift+F</div>
  </div>
</template>

<style scoped>
.fps-meter {
  position: fixed;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 9999;
  pointer-events: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  line-height: 1.45;
  color: #fff;
  background: rgba(0, 0, 0, 0.6);
  padding: 6px 8px;
  border-radius: 4px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  white-space: nowrap;
}
.fps-hint {
  opacity: 0.45;
  margin-top: 2px;
}
</style>
