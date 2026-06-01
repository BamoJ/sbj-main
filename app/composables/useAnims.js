import { REGISTRY } from '~/animations'

/*
 * Scans the calling component's root for `[data-anim]` elements and runs
 * the matching class from the REGISTRY.
 *
 * Usage:
 *   <script setup>
 *     useAnims()
 *   </script>
 *
 * Each class owns its own config + lifecycle. The data-anim attribute is
 * purely a marker — to change behavior, edit the class file, or add a new
 * class and register it under a new name.
 */
export function useAnims(scope) {
  const instance = getCurrentInstance()
  if (!instance) {
    console.warn('[useAnims] must be called inside setup()')
    return
  }

  let active = []

  onMounted(async () => {
    // Scope to the calling component's root element. Pages wrap their
    // template in a single root <div> (required by <Transition> anyway),
    // so instance.vnode.el reliably points at the page root. Critical
    // during simultaneous page transitions (mode: 'default'): the leaving
    // page is still in <main> when the entering page mounts, so scoping
    // to <main> would re-scan the leaving page's [data-anim] elements
    // and re-fire their ScrollTriggers — visibly re-animating them.
    const root = unref(scope) ?? instance.vnode.el ?? document.body
    if (!(root instanceof Element)) return

    // SplitText measures rendered glyphs — split too early and chars get
    // measured at fallback-font widths.
    await document.fonts.ready

    root.querySelectorAll('[data-anim]').forEach((el) => {
      const name = el.dataset.anim
      const Cls = REGISTRY[name]
      if (!Cls) {
        console.warn(`[useAnims] unknown recipe "${name}"`, el)
        return
      }
      const anim = new Cls(el)
      anim.setup()
      anim.activate()
      active.push(anim)
    })
  })

  onUnmounted(() => {
    active.forEach((a) => a.destroy())
    active = []
  })
}
