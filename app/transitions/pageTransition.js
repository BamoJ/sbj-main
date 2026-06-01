import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { easings } from '~/utils/easings'
import { emitter } from '~/utils/Emitter'

gsap.registerPlugin(SplitText, ScrollTrigger)

export const pageTransition = {
  // Nuxt merges this object with its default `{ name: 'page', mode: 'out-in' }`
  // via `defu` — and defu treats undefined as "not set", so just omitting
  // `mode` lets the default 'out-in' win (= sequential, no overlap).
  // Vue's Transition accepts 'default' as an explicit string meaning
  // "simultaneous" — defu sees it as a defined value and stops falling
  // through. This is what actually enables leave + enter to overlap.
  mode: 'default',
  css: false,

  onLeave(el, done) {
    // Signal the WebGL layer + any other system that wants to react to a
    // page swap (mesh fade out, scroll pause, preloader, etc.). No-op when
    // the layer is absent — nobody is listening.
    emitter.emit('transition:start', { direction: 'leave' })
    // Layer composable fades active meshes out via the same call.
    usePageTransition().prepareTransition()

    gsap.to(el, {
      opacity: 0,
      y: -100,
      duration: 0.75,
      ease: 'power3.in',
      onComplete: done,
    })
  },

  // beforeEnter fires synchronously BEFORE the element is rendered.
  // Pin + initial clip MUST land here, not in onEnter, or there's a
  // frame where the new element paints fully visible before our styles
  // apply — that's the "starts blank then pops" jank.
  onBeforeEnter(el) {
    gsap.set(el, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 102,
      clipPath: 'inset(100% 0 0 0)',
    })
  },

  async onEnter(el, done) {
    const finish = () => {
      gsap.set(el, { clearProps: 'all' })
      window.scrollTo(0, 0)
      // useAnims sets up ScrollTriggers during onMounted, which fires
      // while the page is still position: fixed (pinned in onBeforeEnter).
      // ScrollTrigger caches viewport-relative positions at creation time,
      // so those positions are stale once clearProps drops the pin and the
      // page settles into normal flow. refresh() recalculates every
      // trigger's start/end against the live layout — fires any onEnter
      // callbacks that should be active now, and prevents off-by-stale-cache
      // misfires on subsequent scroll.
      ScrollTrigger.refresh()
      emitter.emit('transition:complete')
      done()
    }

    // Clip starts IMMEDIATELY — preserves the overlap with the leaving
    // page's fade so the user doesn't see a "dim window" between the old
    // page disappearing and the new one revealing.
    gsap.to(el, {
      clipPath: 'inset(0% 0 0 0)',
      duration: 1.25,
      ease: 'expo.inOut',
      onComplete: finish,
    })

    // SplitText needs stable font metrics — only the hero stagger waits
    // for fonts.ready, not the clip.
    await document.fonts.ready

    // Sync pages (e.g. index.vue): hero already in DOM. SplitText fires
    // with the choreographed delay against the clip. The page is still
    // clipped invisible by onBeforeEnter, so no flash possible.
    //
    // Async pages (cms-demo via Sanity → SectionHero): hero arrives later.
    // We use a MutationObserver — it fires SYNCHRONOUSLY after the DOM
    // mutation that inserts the hero, BEFORE the browser paints. Inside
    // the callback we immediately set opacity: 0 on the new hero, so the
    // user never sees its unstyled state. Then we run splittext + gsap.set
    // chars off-screen + reveal h1 — all in the same JS task so the next
    // paint shows the off-screen chars (not the natural text).
    let hero = el.querySelector('[data-hero-title]')
    const bg = el.querySelector('img')
    const number = el.querySelector('[data-page-number]')
    let delay = 0.65

    if (!hero) {
      hero = await new Promise((resolve) => {
        const obs = new MutationObserver(() => {
          const found = el.querySelector('[data-hero-title]')
          if (found) {
            found.style.opacity = '0'
            obs.disconnect()
            clearTimeout(timer)
            resolve(found)
          }
        })
        obs.observe(el, { childList: true, subtree: true })
        const timer = setTimeout(() => {
          obs.disconnect()
          resolve(null)
        }, 600)
      })
      delay = 0.5
    }

    if (!hero) return

    const split = new SplitText(hero, {
      type: 'chars,lines',
      mask: 'lines',
      linesClass: 'line',
      smartWrap: true,
    })

    // Move chars off-screen FIRST, then reveal h1. Both synchronous,
    // single JS task → single paint → no flash of natural-position chars.
    gsap.set(split.chars, { yPercent: 110 })
    gsap.set(hero, { opacity: 1 })
    gsap.set(bg, { scale: 1.05, transformOrigin: 'center' })
    gsap.set(number, { opacity: 0, y: 20 })

    gsap.to(split.chars, {
      yPercent: 0,
      duration: 1.25,
      stagger: 0.025,
      ease: 'power4.out',
      delay,
    })
    gsap.to(bg, {
      scale: 1,
      y: 0,
      duration: 1.2,
      ease: 'sine.out',
      delay,
    })
    gsap.to(number, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: 'power2.out',
      delay: delay + 0.25,
    })

    // WebGL meshes enter at the same beat as the chars — uReveal flutter from
    // sharedVert.glsl + uOpacity fade-in. No-op when the layer is off / mobile.
    usePageTransition().enterTransition(delay)
  },
}
