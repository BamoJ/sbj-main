import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import Animation from '../Animation'

gsap.registerPlugin(SplitText)

export default class HeadingReveal extends Animation {
  static config = {
    yPercent: 110,
    duration: 1,
    stagger: 0.025,
    ease: 'power4.out',
    scrollTrigger: false, // hero territory — fires on mount
  }

  create() {
    const c = HeadingReveal.config
    this.split = new SplitText(this.el, {
      type: 'chars,lines',
      mask: 'lines',
      linesClass: 'line',
    })
    this.tl.from(this.split.chars, {
      yPercent: c.yPercent,
      duration: c.duration,
      stagger: c.stagger,
      ease: c.ease,
    })
  }

  cleanup() {
    this.split?.revert()
  }
}
