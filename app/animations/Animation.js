import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '~/utils/media'

gsap.registerPlugin(ScrollTrigger)

/*
 * Animation base class. Subclasses define a static `config` and override
 * `create()` to populate `this.tl`. SplitText-using subclasses also override
 * `cleanup()` to revert the split.
 *
 * Lifecycle: new → setup() → activate() → destroy()
 *   - setup()    builds a paused timeline (skipped when reduced-motion is on)
 *   - activate() arms the ScrollTrigger or plays the timeline immediately
 *                based on the subclass's `config.scrollTrigger`
 *   - destroy()  kills ScrollTrigger + timeline + runs subclass cleanup
 */
export default class Animation {
  static config = {}

  constructor(el) {
    this.el = el
    this.tl = null
    this.st = null
  }

  setup() {
    if (prefersReducedMotion()) return
    this.tl = gsap.timeline({ paused: true })
    this.create()
  }

  create() {
    throw new Error(`[${this.constructor.name}] must override create()`)
  }

  activate() {
    if (!this.tl) return // reduced-motion bail in setup()

    const c = this.constructor.config

    if (c.scrollTrigger === false) {
      this.tl.play()
      return
    }

    this.st = ScrollTrigger.create({
      trigger: this.el,
      start: c.start ?? 'top 85%',
      once: c.once !== false,
      scrub: c.scrub ?? false,
      onEnter: () => this.tl.play(),
      onLeaveBack: () => {
        if (c.once === false) this.tl.reverse()
      },
    })
  }

  destroy() {
    this.st?.kill()
    this.tl?.kill()
    this.cleanup?.()
  }
}
