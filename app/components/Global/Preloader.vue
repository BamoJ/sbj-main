<script setup>
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { emitter } from '~/utils/Emitter'

gsap.registerPlugin(SplitText)

// First-load preloader. Covers the suspended <NuxtPage> from the first frame
// (body is already #131313 so there's no flash) and fades out once the site is
// genuinely loaded — handing off to the WebGL fade-in + a staggered DOM reveal.

const webgl = useWebGL()
const { stop, start } = useLenis()

const visible = ref(true)
const display = ref(0) // on-screen number, 0–100
const overlayEl = ref(null)
const counterEl = ref(null)

// ONE tween owns the number. Retargeting with overwrite:true kills any in-flight
// tween first, so the value only ever moves monotonically toward the target —
// no two-tweens-fighting jank.
const num = { value: 0 }
const setNumber = (v, duration = 0.5) =>
  gsap.to(num, {
    value: v,
    duration,
    ease: 'power2.out',
    overwrite: true,
    onUpdate: () => (display.value = Math.round(num.value)),
  })

onMounted(async () => {
  stop() // no scrolling behind the overlay

  const tracker = trackEverything(webgl)
  const unwatch = watch(tracker.progress, (p) => setNumber(p * 100), {
    immediate: true,
  })

  await tracker.ready
  unwatch()
  tracker.cleanup()
  await playExit()
})

// ── the "everything" tracker ───────────────────────────────────────────────
// Real load progress across fonts, images, the WebGL view and JS/CSS bundles +
// XHR/fetch (via the resource timeline). Completion hinges on the explicit
// milestones; the resource feed only smooths the bar. A hard timeout is the
// failsafe so the overlay can never be trapped.
function trackEverything(gl) {
  const progress = ref(0)
  let resolve
  const ready = new Promise((r) => (resolve = r))

  // WebGL gate is pre-satisfied when the layer is off (touch / reduced-motion / <768px).
  const gates = {
    fonts: false,
    images: false,
    doc: false,
    webgl: !gl?.enabled,
  }
  const total = Object.keys(gates).length
  const doneCount = () => Object.values(gates).filter(Boolean).length

  let settled = false
  let finishTimer = null

  const finish = () => {
    if (settled) return
    settled = true
    po?.disconnect()
    clearTimeout(finishTimer)
    progress.value = 1
    resolve()
  }
  const maybeFinish = () => {
    progress.value = Math.max(progress.value, doneCount() / total)
    if (doneCount() === total) {
      clearTimeout(finishTimer)
      finishTimer = setTimeout(finish, 300) // brief settle so the bar reaches 100
    }
  }
  const markGate = (key) => () => {
    gates[key] = true
    maybeFinish()
  }

  let po = null
  try {
    po = new PerformanceObserver((list) => {
      if (list.getEntries().length && !settled) {
        progress.value = Math.min(0.95, progress.value + 0.005)
      }
    })
    po.observe({ type: 'resource', buffered: true })
  } catch {
    /* unsupported — gates + timeout still resolve */
  }

  document.fonts.ready.then(markGate('fonts'))

  if (document.readyState === 'complete') gates.doc = true
  else
    window.addEventListener('load', markGate('doc'), { once: true })

  if (gl?.enabled) emitter.once('webgl:ready', markGate('webgl'))

  Promise.allSettled(
    [...document.images].map((i) => i.decode().catch(() => {})),
  ).then(markGate('images'))

  maybeFinish()
  setTimeout(finish, 8000) // failsafe

  return {
    progress,
    ready,
    cleanup: () => {
      po?.disconnect()
      clearTimeout(finishTimer)
    },
  }
}

// ── exit: settle to 100, flip the digits out, then fade ─────────────────────
async function playExit() {
  await setNumber(100, 0.4) // single clean tween to 100
  await nextTick() // the span now reads "100" — safe to split it

  // Per-digit overflow mask so each digit clips behind its own box as it flips.
  const split = new SplitText(counterEl.value, {
    type: 'chars',
    mask: 'chars',
  })
  // WebGL intro is fired from a master callback below (NOT nested) — a paused
  // child timeline added to a parent does not advance in GSAP.

  const master = gsap.timeline({
    onComplete: () => {
      split.revert()
      start()
      visible.value = false
      emitter.emit('preloader:done')
    },
  })

  // The overlay fade and the WebGL particle intro both start HERE, so the particles
  // fade + gather in AS the overlay fades out — a crossfade. One knob to move both.
  const HANDOFF = 0.6

  // 1. digits flip OUT along the X axis — rotateY (around the vertical axis) so
  //    each digit swings out sideways and is clipped by its per-char mask.
  master.to(
    split.chars,
    { xPercent: 100, duration: 0.5, ease: 'power3.out' },
    0,
  )
  // 2. overlay fades out …
  master.to(
    overlayEl.value,
    { opacity: 0, duration: 0.6, ease: 'power2.out' },
    HANDOFF,
  )
  // 3. … and the particles fade + gather in at the SAME instant (crossfade).
  master.call(() => webgl?.currentPage?.playIntro?.(), null, HANDOFF)
  // 4. DOM staggers in just after the handoff.
  master.from(
    '[data-load-top]',
    {
      yPercent: 120,
      stagger: 0.03,
      duration: 1,
      ease: 'power3.out',
    },
    HANDOFF + 0.2,
  )
  master.from(
    '[data-load-top-cicle]',
    {
      autoAlpha: 0,
      stagger: 0.03,
      duration: 1,
      ease: 'power3.out',
    },
    '<+.1',
  )
  // 5. homepage texts (mid) fade up, cascading in just after the nav row.
  master.from(
    '[data-load-mid]',
    {
      yPercent: 100,
      stagger: {
        amount: 0.6,
      },
      duration: 1,
      ease: 'power3.out',
    },
    HANDOFF + 0.7,
  )
  master.from(
    '[data-load-line]',
    {
      scaleX: 0,
      stagger: {
        amount: 0.6,
      },
      duration: 1,
      ease: 'power4.out',
    },
    HANDOFF + 0.75,
  )
}

onBeforeUnmount(() => start())
</script>

<template>
  <div
    v-if="visible"
    ref="overlayEl"
    class="preloader"
    aria-hidden="true"
  >
    <span ref="counterEl" class="text-medium">{{ display }}</span>
  </div>
</template>

<style scoped>
.preloader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #131313;
  display: flex;
  align-items: center;
  justify-content: start;
  padding: 2rem;
  will-change: opacity;
}
</style>
