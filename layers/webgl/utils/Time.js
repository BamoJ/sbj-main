import { Emitter } from '~/utils/Emitter'

/**
 * Time — the WebGL layer's frame clock. Ported from sbj-starter-main
 * (`src/canvas/utils/Time.js`), which the original used as the single source of
 * delta/elapsed for every page's `update(time)`.
 *
 * One deliberate change from the original. There, Time owned its own
 * `requestAnimationFrame` (via `addRaf`, priority 1, after Lenis at 0). This
 * project has no `addRaf` — the central loop is `gsap.ticker`, shared by Lenis,
 * ScrollTrigger and the WebGL renderer so they all advance in the same frame and
 * never tear (see `app/composables/useLenis.js` + the webgl plugin). A second
 * RAF would defeat that, so Time is *driven* instead: the plugin calls `tick()`
 * once per `gsap.ticker` frame. Same role the original's `addRaf` played, just on
 * this project's central loop. `play()/pause()/stop()` and the `'tick'` event are
 * preserved so page-level code can `time.on('tick', …)` exactly as before.
 *
 * Units: `delta`, `elapsed`, `current` are milliseconds (as in the original).
 * Shader `uTime` uniforms expect seconds — use the `seconds` getter for those.
 */
export default class Time extends Emitter {
  constructor() {
    super()

    this.start = performance.now()
    this.current = this.start
    this.elapsed = 0
    this.delta = 16
    this.playing = true
  }

  // Called once per frame by the plugin's gsap.ticker callback.
  tick() {
    const current = performance.now()
    this.delta = current - this.current
    // Clamp a long frame (tab refocus, GC pause, first frame after mount) so
    // time-driven animation doesn't lurch.
    if (this.delta > 60) this.delta = 60
    this.elapsed += this.playing ? this.delta : 0
    this.current = current

    if (this.playing) this.emit('tick', this)
  }

  // Elapsed time in seconds — for shader `uTime` uniforms.
  get seconds() {
    return this.elapsed * 0.001
  }

  play() {
    this.playing = true
  }

  pause() {
    this.playing = false
  }

  stop() {
    this.playing = false
  }
}
