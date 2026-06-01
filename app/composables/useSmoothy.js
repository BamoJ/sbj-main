import Core from 'smooothy'
import gsap from 'gsap'
import { isMobile } from '~/utils/media'

// Wraps smooothy Core in a Vue-friendly composable. Owns the gsap.ticker
// registration (one shared RAF with Lenis + ScrollTrigger — see useLenis),
// applies mobile-adaptive lerp/touch tuning, and cleans up on unmount.
//
// Callers pass a template ref to the wrapper element whose direct children
// are the slides. The composable returns reactive state + navigation methods.
//
// Mobile bypass note: smooothy itself is small and DOM-only, so it runs on
// mobile too. The "mobile" branch here just softens the lerp + boosts touch
// sensitivity to match playfight's feel.
export function useSmoothy(wrapperRef, options = {}) {
  const instance = shallowRef(null)
  const currentSlide = ref(0)
  const progress = ref(0)
  const speed = ref(0)
  const isReady = ref(false)

  let tickerFn = null

  onMounted(() => {
    if (!wrapperRef.value) return

    const mobile = isMobile()
    const userVS = options.virtualScroll || {}

    const config = {
      lerpFactor: mobile ? 0.18 : 0.3,
      snapStrength: mobile ? 0.18 : 0.1,
      ...options,
      virtualScroll: {
        mouseMultiplier: 0.5,
        touchMultiplier: mobile ? 2.2 : 1.25,
        firefoxMultiplier: 30,
        useKeyboard: false,
        passive: true,
        ...userVS,
      },
      onSlideChange: (cur, prev) => {
        currentSlide.value = cur
        options.onSlideChange?.(cur, prev)
      },
      onUpdate: (core) => {
        progress.value = core.progress
        speed.value = core.speed
        options.onUpdate?.(core)
      },
      onResize: (core) => {
        options.onResize?.(core)
      },
    }

    const core = new Core(wrapperRef.value, config)
    instance.value = core
    isReady.value = true

    tickerFn = () => core.update()
    gsap.ticker.add(tickerFn)
  })

  onBeforeUnmount(() => {
    if (tickerFn) gsap.ticker.remove(tickerFn)
    // Do NOT call core.destroy() here. Smooothy's destroy() calls kill()
    // which sets `style.transform = ""` on every slide — that visually snaps
    // the slider back to its natural flex layout (= "slide 0 centered" given
    // our margin-left centering). The unmount fires INSTANTLY on nav click
    // because Nuxt's Suspense unmounts the leaving page as soon as the new
    // page is ready (synchronous when the new page has no async setup), even
    // though Vue Transition mode 'default' keeps the DOM element visible for
    // the leave animation. The result was a visible "reset to 0" the instant
    // the user clicked a nav link.
    //
    // Workaround: skip kill()/destroy(). Disconnect only the IntersectionObserver
    // to stop background visibility callbacks. Everything else (event listeners,
    // smoothy instance itself) is GC'd when the DOM elements are removed after
    // the leave animation completes.
    instance.value?.observer?.disconnect()
    instance.value = null
    isReady.value = false
  })

  return {
    instance,
    currentSlide,
    progress,
    speed,
    isReady,
    goToNext: () => instance.value?.goToNext(),
    goToPrev: () => instance.value?.goToPrev(),
    goToIndex: (i) => instance.value?.goToIndex(i),
    setPaused: (v) => {
      if (instance.value) instance.value.paused = v
    },
  }
}
