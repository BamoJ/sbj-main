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
// Drives the loader number from REAL load signals, normalized + monotonic:
//   • Resource-timing backbone: EVERY script / css / font / img / fetch / xhr
//     (past via buffered:true + future), summed by transferSize → a byte-weighted
//     fill that climbs faster on fast connections, slower on slow ones.
//   • Weighted milestones for work bytes can't represent: fonts, WebGL (texture
//     rasterize + first GPU frame), CMS (the lazy Sanity queries settling).
//   • Finish = every milestone done AND the network idle ~500ms (catches the
//     late/lazy tail — images added after CMS, deferred chunks, CDN images).
//   • 8s hard failsafe so the overlay can never be trapped.
// Honest limits (see .claude/skills/preloader): the loader's own JS/CSS load
// before it can render — counted retroactively (buffered) but the bar visibly
// starts at JS-ready; and total bytes are unknown upfront, so the number is a
// real-signal-driven normalized estimate that hits 100 exactly at true finish.
function trackEverything(gl) {
  const progress = ref(0)
  let resolve
  const ready = new Promise((r) => (resolve = r))

  // Milestones — discrete work the byte feed can't see. webgl/cms are
  // pre-satisfied when they don't apply (WebGL off on touch / <768px; cms
  // already settled by the time the loader mounts).
  const cmsReady = useState('cms:ready', () => false)
  const milestones = {
    fonts: false,
    // Pre-satisfied when WebGL won't activate for THIS load (touch/reduced-motion,
    // or a narrow <768px window where the static BG shows) — otherwise we'd wait
    // on a `webgl:ready` that never fires and fall back to the 8s timeout.
    webgl: !gl?.enabled || !gl?.activeRef?.value,
    cms: cmsReady.value === true,
  }
  const msTotal = Object.keys(milestones).length
  const msDone = () => Object.values(milestones).filter(Boolean).length

  // Byte-weighted fill. Resource-timing entries only fire when a resource
  // COMPLETES, so we sum finished bytes and map them through a saturating curve
  // normalized by an expected first-load weight → smooth, load-proportional.
  const SCALE = 600_000 // ≈ expected first-load transfer (tunable)
  let bytesLoaded = 0
  let lastResourceAt = performance.now()

  let settled = false
  let finishTimer = null // 8s failsafe
  let idleTimer = null // network-idle watcher

  const finish = () => {
    if (settled) return
    settled = true
    po?.disconnect()
    clearTimeout(finishTimer)
    clearTimeout(idleTimer)
    progress.value = 1
    resolve()
  }

  // Done only when every milestone is satisfied AND the network has gone quiet.
  const maybeFinish = () => {
    clearTimeout(idleTimer)
    if (msDone() < msTotal) return
    const wait = Math.max(0, 500 - (performance.now() - lastResourceAt))
    idleTimer = setTimeout(finish, wait)
  }

  const compute = () => {
    if (settled) return
    const resourcePart = 1 - Math.exp(-bytesLoaded / SCALE) // 0 → ~1 by bytes
    const msPart = msDone() / msTotal
    // Blend; held below 1 until the real finish so the number never lies.
    const target = Math.min(0.99, 0.5 * msPart + 0.5 * resourcePart)
    progress.value = Math.max(progress.value, target) // monotonic
    maybeFinish()
  }

  const markMilestone = (key) => () => {
    milestones[key] = true
    compute()
  }

  let po = null
  try {
    po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        bytesLoaded += e.transferSize || e.encodedBodySize || 0
      }
      lastResourceAt = performance.now()
      compute()
    })
    po.observe({ type: 'resource', buffered: true }) // past + future resources
  } catch {
    /* unsupported — milestones + timeout still resolve */
  }

  document.fonts.ready.then(markMilestone('fonts'))
  if (gl?.enabled) emitter.once('webgl:ready', markMilestone('webgl'))
  if (!milestones.cms) {
    const stop = watch(cmsReady, (v) => {
      if (v) {
        stop()
        markMilestone('cms')()
      }
    })
  }

  compute()
  finishTimer = setTimeout(finish, 8000) // failsafe

  return {
    progress,
    ready,
    cleanup: () => {
      po?.disconnect()
      clearTimeout(finishTimer)
      clearTimeout(idleTimer)
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
