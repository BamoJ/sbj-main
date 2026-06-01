import gsap from 'gsap'
import CustomEase from 'gsap/CustomEase'

gsap.registerPlugin(CustomEase)

/**
 * Signature easing curves. Reference by object key, not by string —
 * registering with CustomEase makes the string-form name globally available
 * to GSAP too (e.g. ease: 'paragraphEase'), but going through this object
 * keeps the names greppable.
 */
export const easings = {
  linear: 'linear',

  lineEase: CustomEase.create('lineEase', 'M0,0 C0.602,0.01 -0.024,0.995 1,1 '),

  paragraphEase: CustomEase.create('paragraphEase', 'M0,0 C0.38,0.005 0.1216,1.0005 1,1'),

  transitionEase: CustomEase.create('transitionEase', '.6,.11,.18,.99'),

  heading: CustomEase.create('heading', 'M0,0 C0.3851,0.0101 0.0884,0.9991 1,1'),
}
