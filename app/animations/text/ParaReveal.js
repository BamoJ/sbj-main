import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import Animation from '../Animation'

gsap.registerPlugin(SplitText)

export default class ParaReveal extends Animation {
  static config = {
    yPercent: 100,
    duration: 1,
    stagger: 0.045,
    ease: 'power3.out',
    scrollTrigger: true,
    start: 'top 85%',
    once: true,
  }

  create() {
    const c = ParaReveal.config
    this.split = new SplitText(this.el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'line',
      smartWrap: true,
      reduceWhiteSpace: false,
    })
    this.tl.from(this.split.lines, {
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
