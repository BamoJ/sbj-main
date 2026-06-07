import { gsap } from 'gsap'
import { isTouch, prefersReducedMotion } from '~/utils/media'

// Boots the WebGL stage and exposes it as `$webgl`. Three.js is NOT in the boot
// bundle: the Canvas (and three) are dynamically imported the first time the
// canvas actually activates (desktop ≥768px) via `ensure()`. So mobile/touch and
// the initial paint never download/parse three.js — it lands in its own chunk.
//
// Two-level gating (unchanged behaviour, just deferred loading):
//   • Capability (touch / reduced-motion): disabled stub, three.js never loaded.
//   • `activeRef` (viewport ≥ 768px): reactive ref toggling particles ↔ BG live.
//     Kept SYNCHRONOUS here so consumers (index.vue showLogoFallback, Preloader)
//     read it at boot without waiting on the deferred Canvas.
const BREAKPOINT = '(min-width: 768px)'

export default defineNuxtPlugin({
  name: 'webgl',
  parallel: true,
  setup(nuxtApp) {
    if (prefersReducedMotion() || isTouch()) {
      nuxtApp.provide('webgl', {
        enabled: false,
        activeRef: ref(false),
        visibleRef: ref(true),
        ensure() {},
        mount() {},
        unmount() {},
        onChange() {},
        setRenderActive() {},
      })
      return
    }

    // Reactive viewport gate — synchronous, flips on every breakpoint crossing.
    const mq = window.matchMedia(BREAKPOINT)
    const activeRef = ref(mq.matches)
    const onMq = (e) => { activeRef.value = e.matches }
    mq.addEventListener('change', onMq)

    // Tab-visibility gate — pauses rendering when the tab is backgrounded so the
    // particle sim doesn't keep cooking the GPU in a hidden tab. Combined with the
    // breakpoint gate in WebGLCanvas (active = desktop AND visible). visibilitychange
    // only — NOT blur/focus, which fire while the tab is still on-screen.
    const visibleRef = ref(!document.hidden)
    const onVis = () => { visibleRef.value = !document.hidden }
    document.addEventListener('visibilitychange', onVis)

    let canvas = null
    let loadPromise = null
    let tick = null

    // The stable object every consumer captures. Methods delegate to the real
    // Canvas once `ensure()` has loaded it; they're safe no-ops before that.
    const controller = {
      enabled: true,
      activeRef,
      visibleRef,
      get currentPage() { return canvas?.currentPage ?? null },
      get transition() { return canvas?.transition ?? null },
      get renderer() { return canvas?.renderer ?? null },

      // Dynamically import three + Canvas ONCE, wire it into the shared ticker.
      // Idempotent: concurrent/repeat calls share the one in-flight promise.
      ensure() {
        if (canvas) return Promise.resolve(canvas)
        if (!loadPromise) {
          loadPromise = (async () => {
            const [{ default: Canvas }, { registry }] = await Promise.all([
              import('../canvas'),
              import('../canvas/registry'),
            ])
            canvas = new Canvas(registry)
            canvas.activeRef = activeRef
            tick = () => canvas.time.tick()
            gsap.ticker.add(tick)
            return canvas
          })()
        }
        return loadPromise
      },

      mount(el) { return canvas?.mount(el) },
      onChange(name, data) { return canvas?.onChange(name, data) },
      setRenderActive(v) { canvas?.setRenderActive(v) },
      unmount() {
        if (tick) gsap.ticker.remove(tick)
        canvas?.unmount()
        canvas = null
        loadPromise = null
      },
    }

    if (import.meta.hot) {
      // Avoid stacking tickers / listeners across HMR reloads of this plugin.
      import.meta.hot.dispose(() => {
        if (tick) gsap.ticker.remove(tick)
        mq.removeEventListener('change', onMq)
        document.removeEventListener('visibilitychange', onVis)
      })
    }

    nuxtApp.provide('webgl', controller)
  },
})
