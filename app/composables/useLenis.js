import Lenis from 'lenis'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { emitter } from '~/utils/Emitter'

gsap.registerPlugin(ScrollTrigger)

// Module-scoped — Vue's idiomatic singleton. First caller initializes;
// every subsequent useLenis() returns controls bound to the same instance.
// Vanilla equivalent: SmoothScroll.instance from the Webflow setup.
let lenis = null
let tickerCallback = null
const scrollY = ref(0)

export function useLenis(options = {}) {
  if (lenis) return makeControls()

  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1.6,
    syncTouches: true,
    autoResize: true,
    touchMultiplier: 1,
    allowNestedScroll: true,
    ...options,
  })

  lenis.on('scroll', ({ scroll, velocity }) => {
    scrollY.value = scroll
    ScrollTrigger.update()
    // Cross-layer signal for the WebGL layer (and anyone else who cares).
    // Cheap no-op when the layer is absent — nobody is listening.
    emitter.emit('scroll:update', { scroll, velocity })
  })

  // Single rAF loop for both Lenis and GSAP — perfect frame ordering for
  // pinned ScrollTriggers. GSAP ticker passes time in seconds; Lenis wants ms.
  tickerCallback = (time) => lenis.raf(time * 1000)
  gsap.ticker.add(tickerCallback)
  gsap.ticker.lagSmoothing(0)

  return makeControls()
}

function makeControls() {
  return {
    lenis,
    scrollY,
    start: () => lenis?.start(),
    stop: () => lenis?.stop(),
    scrollTo: (target, opts) => lenis?.scrollTo(target, opts),
  }
}
