import { gsap } from 'gsap'
import { isTouch, prefersReducedMotion } from '~/utils/media'
import Canvas from '../canvas'
import { registry } from '../canvas/registry'

// Boots the WebGL stage and exposes it as `$webgl` (the Canvas instance).
// The renderer is NOT created here — WebGLCanvas.vue calls `$webgl.mount(el)`
// when the viewport first crosses the breakpoint.
//
// Two-level gating:
//   • Capability (touch / reduced-motion): disabled stub, no Three.js built — the
//     static home BG shows. Fixed per device.
//   • `activeRef` (viewport ≥ 768px): a reactive ref that toggles particles ↔ BG
//     live on resize. Components read it; WebGLCanvas pauses/shows accordingly.
const BREAKPOINT = '(min-width: 768px)'

export default defineNuxtPlugin({
  name: 'webgl',
  parallel: true,
  setup(nuxtApp) {
    if (prefersReducedMotion() || isTouch()) {
      nuxtApp.provide('webgl', {
        enabled: false,
        activeRef: ref(false),
        mount() {},
        unmount() {},
        onChange() {},
        setRenderActive() {},
      })
      return
    }

    const canvas = new Canvas(registry)

    // Reactive viewport gate — flips on every breakpoint crossing.
    const mq = window.matchMedia(BREAKPOINT)
    const activeRef = ref(mq.matches)
    const onMq = (e) => { activeRef.value = e.matches }
    mq.addEventListener('change', onMq)
    canvas.activeRef = activeRef

    // Single loop: gsap.ticker drives Time, Time triggers Canvas.update().
    // Shared with Lenis + ScrollTrigger so every system advances in one frame.
    const tick = () => canvas.time.tick()
    gsap.ticker.add(tick)

    if (import.meta.hot) {
      // Avoid stacking tickers / listeners across HMR reloads of this plugin.
      import.meta.hot.dispose(() => {
        gsap.ticker.remove(tick)
        mq.removeEventListener('change', onMq)
      })
    }

    nuxtApp.provide('webgl', canvas)
  },
})
