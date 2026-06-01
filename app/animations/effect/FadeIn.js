import Animation from '../Animation'

export default class FadeIn extends Animation {
  static config = {
    y: 24,
    duration: 0.9,
    ease: 'power3.out',
    delay: 0,
    scrollTrigger: true,
    start: 'top 85%',
    once: true,
  }

  create() {
    const c = FadeIn.config
    this.tl.from(this.el, {
      opacity: 0,
      y: c.y,
      duration: c.duration,
      ease: c.ease,
      delay: c.delay,
    })
  }
}
