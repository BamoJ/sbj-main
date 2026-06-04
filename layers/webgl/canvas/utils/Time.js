import EventEmitter from './EventEmitter'

// Frame clock. Ported from the lab's Time, with ONE change: it does not own a
// requestAnimationFrame. In this project the shared `gsap.ticker` (Lenis +
// ScrollTrigger ride it too) is the single loop, so the webgl plugin calls
// `tick()` once per ticker frame instead. `trigger('tick')` is preserved, so
// `Canvas` still does `this.time.on('tick', () => this.update())` like the lab.
//
// Units: delta/elapsed are milliseconds (delta clamped to 60 to absorb long
// frames after a tab refocus / GC pause).
export default class Time extends EventEmitter {
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
    if (this.delta > 60) this.delta = 60
    this.elapsed += this.playing ? this.delta : 0
    this.current = current
    if (this.playing) this.trigger('tick')
  }

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
