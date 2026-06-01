import { gsap } from 'gsap'

// Module-scoped registry of meshes that should react to page transitions.
// The placeholder mesh (created in the plugin) self-registers here at boot.
// Optional helpers like useDOMPlane() also register their meshes here when
// pages opt in. The transition hooks below operate on whichever meshes are
// alive at call time — no manual wiring needed.
const meshes = new Set()

export function registerTransitionMesh(m) {
  meshes.add(m)
}

export function unregisterTransitionMesh(m) {
  meshes.delete(m)
}

// Hook composable called from app/transitions/pageTransition.js. Drives the
// `uTransition` uniform on every registered mesh so the WebGL canvas visibly
// reacts to route changes — without any page having to know it exists.
export function usePageTransition() {
  const canvas = useCanvas()

  function prepareTransition() {
    if (!canvas.enabled) return
    meshes.forEach((m) => {
      const u = m.material.uniforms
      if (u.uTransition) {
        gsap.to(u.uTransition, { value: 1, duration: 0.6, ease: 'sine.in' })
      }
      // Legacy DOMPlane uniforms — animated when DOMPlane is in use; harmless
      // otherwise (the if-checks guard against meshes that don't have them).
      if (u.uOpacity) gsap.to(u.uOpacity, { value: 0, duration: 0.4, ease: 'sine.in' })
      if (u.uPageTransition) gsap.to(u.uPageTransition, { value: 1, duration: 0.6, ease: 'sine.in' })
    })
  }

  function enterTransition(delay = 0) {
    if (!canvas.enabled) return
    meshes.forEach((m) => {
      const u = m.material.uniforms
      if (u.uTransition) {
        gsap.to(u.uTransition, { value: 0, duration: 1, ease: 'expo.out', delay })
      }
      if (u.uEntrance) {
        gsap.set(u.uEntrance, { value: 1 })
        gsap.to(u.uEntrance, { value: 0, duration: 1.4, ease: 'expo.out', delay })
      }
      if (u.uOpacity) {
        gsap.set(u.uOpacity, { value: 0 })
        gsap.to(u.uOpacity, { value: 1, duration: 1, ease: 'sine.out', delay })
      }
      if (u.uPageTransition) gsap.set(u.uPageTransition, { value: 0 })
    })
  }

  return { prepareTransition, enterTransition }
}
