import { Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three'
// `?raw` is Vite-native — returns the file as a plain string with no plugin
// transform. vite-plugin-glsl 1.6 had a double-wrap bug and 1.3 emits output
// that newer Vite treats as raw text, so the imported value was the JS source
// rather than the GLSL. ?raw avoids the whole class of issues.
import vertexShader from '@shaders/sharedVert.glsl?raw'
import fragmentShader from '@shaders/sharedFrag.glsl?raw'
import { textureCache } from '../utils/TextureCache'
import { useCanvas } from './useCanvas'
import { registerTransitionMesh, unregisterTransitionMesh } from './usePageTransition'

// OPTIONAL helper. The default WebGL is a placeholder mesh in the plugin —
// pages get a working canvas without calling this. Use useDOMPlane only when
// a page actually wants to map a DOM element to a WebGL plane (image hero
// with shader effects, gallery thumb, etc.).
//
// Pass a template ref + texture URL, get back a Three.js plane that:
//   • sizes itself to the DOM rect (FOV-based viewport math)
//   • syncs position every frame so scroll + layout stay glued
//   • applies cover-fit UV correction (object-fit: cover semantics)
//   • registers with the transition mesh registry (auto-fades on route change)
//   • disposes geometry/material/listeners on unmount
export function useDOMPlane(elementRef, textureUrl, options = {}) {
  const canvas = useCanvas()
  const mesh = shallowRef(null)
  const isReady = ref(false)

  if (!canvas.enabled) {
    // Mobile / layer-off: composable exists, does nothing.
    return { mesh, isReady }
  }

  let rafCallback = null

  async function mount() {
    const el = elementRef.value
    if (!el) return

    const src = unref(textureUrl)
    if (!src) return

    const texture = await textureCache.load(src)
    if (!elementRef.value) return // unmounted while loading

    const bounds = el.getBoundingClientRect()
    if (bounds.width === 0 || bounds.height === 0) return

    const width = (bounds.width / canvas.screen.width) * canvas.viewport.width
    const height = (bounds.height / canvas.screen.height) * canvas.viewport.height

    const geometry = new PlaneGeometry(width, height, 24, 24)

    // Cover UV: scale so the texture's aspect matches the plane without
    // squishing. Equivalent to CSS `object-fit: cover`.
    const img = texture.image
    const imgAspect = (img?.naturalWidth ?? bounds.width) / (img?.naturalHeight ?? bounds.height)
    const planeAspect = bounds.width / bounds.height
    const coverScale = new Vector2(1, 1)
    if (imgAspect > planeAspect) {
      coverScale.x = planeAspect / imgAspect
    }
    else {
      coverScale.y = imgAspect / planeAspect
    }

    const u = options.uniforms ?? {}
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uTexture: { value: texture },
        uTime: { value: 0 },
        uStrength: { value: 0 },
        uScrollProgress: { value: 0 },
        uOpacity: { value: 1 },
        uViewportSizes: { value: new Vector2(canvas.viewport.width, canvas.viewport.height) },
        uCoverScale: { value: coverScale },
        uMouse: { value: new Vector2(0.5, 0.5) },
        uBulge: { value: 0 },
        uEntrance: { value: 0 },
        uPageTransition: { value: 0 },
        uRGBMul: { value: u.rgbShift ?? 1 },
        uBlurMul: { value: u.blur ?? 1 },
        uBulgeMul: { value: u.bulge ?? 0 },
        uBulgeStrengthMul: { value: u.bulgeStrength ?? 1 },
      },
    })

    const m = new Mesh(geometry, material)
    canvas.scene.add(m)
    syncPosition(m, el)
    mesh.value = m
    isReady.value = true
    registerTransitionMesh(m)

    if (options.hideSource !== false) {
      el.style.visibility = 'hidden'
    }

    // Per-frame sync. Cheap: one getBoundingClientRect + one position.set.
    rafCallback = () => {
      const cur = mesh.value
      if (!cur) return
      const target = elementRef.value
      if (!target) return
      const mat = cur.material
      // `time.elapsed` is ms now (Time is ms-based); shaders want seconds.
      mat.uniforms.uTime.value = canvas.time.seconds
      syncPosition(cur, target)
    }
    emitter.on('webgl:tick', rafCallback)
  }

  function syncPosition(m, el) {
    const bounds = el.getBoundingClientRect()
    if (bounds.width === 0 || bounds.height === 0) return
    const x = ((bounds.left + bounds.width / 2) / canvas.screen.width) * canvas.viewport.width
      - canvas.viewport.width / 2
    const y = canvas.viewport.height / 2
      - ((bounds.top + bounds.height / 2) / canvas.screen.height) * canvas.viewport.height
    m.position.set(x, y, 0)
  }

  function resize() {
    const m = mesh.value
    const el = elementRef.value
    if (!m || !el) return
    const bounds = el.getBoundingClientRect()
    if (bounds.width === 0 || bounds.height === 0) return

    const width = (bounds.width / canvas.screen.width) * canvas.viewport.width
    const height = (bounds.height / canvas.screen.height) * canvas.viewport.height

    m.geometry.dispose()
    m.geometry = new PlaneGeometry(width, height, 24, 24)
    m.material.uniforms.uViewportSizes.value.set(canvas.viewport.width, canvas.viewport.height)
  }

  function dispose() {
    const m = mesh.value
    if (m) {
      unregisterTransitionMesh(m)
      m.geometry.dispose()
      m.material.dispose()
      canvas.scene?.remove(m)
    }
    if (rafCallback) {
      emitter.off('webgl:tick', rafCallback)
      rafCallback = null
    }
    emitter.off('webgl:resize', resize)
    if (options.hideSource !== false && elementRef.value) {
      elementRef.value.style.visibility = ''
    }
    mesh.value = null
    isReady.value = false
  }

  onMounted(async () => {
    // Wait one tick — the page's hero <NuxtImg> wraps to <img>, and the rect is
    // 0×0 before the next paint.
    await nextTick()
    if (canvas.ready.value) {
      await mount()
    }
    else {
      // Renderer hasn't attached yet (WebGLCanvas mounts in the same tick).
      // Listen for the ready signal and proceed then.
      const onReady = async () => {
        emitter.off('webgl:ready', onReady)
        await mount()
      }
      emitter.on('webgl:ready', onReady)
    }
    emitter.on('webgl:resize', resize)
  })

  onUnmounted(dispose)

  return { mesh, isReady }
}
