import { Mesh, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, SRGBColorSpace, WebGLRenderer } from 'three'
import { gsap } from 'gsap'
import { isMobile } from '~/utils/media'
import { emitter } from '~/utils/Emitter'
import Time from '../utils/Time'
import { registerTransitionMesh } from '../composables/usePageTransition'

// Default disabled context — destructuring at call sites never throws.
function makeDisabledContext() {
  return {
    enabled: false,
    viewport: { width: 0, height: 0 },
    screen: { width: 0, height: 0 },
    time: { delta: 0, elapsed: 0, current: 0, seconds: 0 },
    ready: ref(false),
    mount: () => {},
    unmount: () => {},
    registerPage: () => {},
    unregisterPage: () => {},
  }
}

// Minimal inline shaders for the placeholder mesh. Baseline = barely-visible
// bottom-edge wave (proves the canvas is alive). uTransition spikes during
// route changes via usePageTransition() — a centred radial pulse so you can
// SEE the WebGL pipeline participating in the transition.
const PLACEHOLDER_VERT = `
  precision highp float;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const PLACEHOLDER_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uTransition;

  void main() {
    // Baseline: slow rolling wave along the bottom — barely visible, just
    // enough to show the canvas is rendering frames.
    float wave = sin(vUv.x * 6.2831 + uTime * 0.5) * 0.5 + 0.5;
    float bottomMask = smoothstep(0.0, 0.12, 1.0 - vUv.y);
    float baseline = wave * bottomMask * 0.10;

    // Transition: radial pulse from the centre. uTransition is driven by
    // usePageTransition() — peaks during route changes, returns to 0 at rest.
    float dist = length(vUv - vec2(0.5)) * 2.0;
    float pulse = clamp(1.0 - dist, 0.0, 1.0) * uTransition;

    vec3 color = mix(vec3(1.0, 0.55, 0.25), vec3(1.0, 0.85, 0.45), pulse);
    float opacity = baseline + pulse * 0.55;

    gl_FragColor = vec4(color, opacity);
  }
`

export default defineNuxtPlugin({
  name: 'webgl-bootstrap',
  parallel: true,
  setup(nuxtApp) {
    // Hard mobile bypass — no Three.js compiled, no event subscriptions.
    if (isMobile()) {
      nuxtApp.provide('webgl', makeDisabledContext())
      return
    }

    const scene = new Scene()
    const camera = new PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.z = 1

    const viewport = { width: 0, height: 0 }
    const screen = { width: 0, height: 0 }
    const time = new Time()
    const ready = ref(false)
    const pages = new Set()

    // Wrapped in an object so reassignment inside mount() propagates to
    // `$webgl.renderer` via the getter below.
    const state = { renderer: undefined, placeholder: undefined }
    let tickerCallback = null
    let resizeHandler = null

    function computeViewport() {
      screen.width = window.innerWidth
      screen.height = window.innerHeight
      const fov = camera.fov * (Math.PI / 180)
      const height = 2 * Math.tan(fov / 2) * camera.position.z
      const width = height * (screen.width / screen.height)
      viewport.width = width
      viewport.height = height
    }

    function resize() {
      if (!state.renderer) return
      computeViewport()
      camera.aspect = screen.width / screen.height
      camera.updateProjectionMatrix()
      state.renderer.setSize(screen.width, screen.height, false)
      // Rescale the placeholder mesh to fit the new viewport.
      if (state.placeholder) {
        state.placeholder.geometry.dispose()
        state.placeholder.geometry = new PlaneGeometry(viewport.width, viewport.height)
      }
      emitter.emit('webgl:resize', { viewport, screen })
    }

    function createPlaceholder() {
      const geometry = new PlaneGeometry(viewport.width, viewport.height)
      const material = new ShaderMaterial({
        vertexShader: PLACEHOLDER_VERT,
        fragmentShader: PLACEHOLDER_FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uTransition: { value: 0 },
        },
      })
      const mesh = new Mesh(geometry, material)
      mesh.position.set(0, 0, 0)
      scene.add(mesh)
      state.placeholder = mesh
      // Register with the transition system so route changes drive uTransition.
      registerTransitionMesh(mesh)
    }

    function mount(canvas) {
      if (state.renderer) return // idempotent

      const renderer = new WebGLRenderer({
        canvas,
        alpha: true,
        antialias: window.devicePixelRatio < 2,
        powerPreference: 'high-performance',
        stencil: false,
        depth: false,
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.outputColorSpace = SRGBColorSpace
      renderer.setClearColor(0x000000, 0)
      state.renderer = renderer

      computeViewport()
      camera.aspect = screen.width / screen.height
      camera.updateProjectionMatrix()
      renderer.setSize(screen.width, screen.height, false)

      createPlaceholder()

      // Share gsap.ticker with Lenis + ScrollTrigger so all animation systems
      // advance in the same frame and never tear. Time is driven off this same
      // tick (it owns no RAF of its own) — see layers/webgl/utils/Time.js.
      tickerCallback = () => {
        time.tick()
        if (state.placeholder) {
          state.placeholder.material.uniforms.uTime.value = time.seconds
        }
        emitter.emit('webgl:tick', { delta: time.delta, elapsed: time.elapsed })
        pages.forEach((page) => page.update?.(time))
        renderer.render(scene, camera)
      }
      gsap.ticker.add(tickerCallback)

      resizeHandler = debounce(() => resize(), 150)
      window.addEventListener('resize', resizeHandler)

      ready.value = true
      emitter.emit('webgl:ready', { scene, camera, renderer, viewport, screen })
    }

    function unmount() {
      if (tickerCallback) {
        gsap.ticker.remove(tickerCallback)
        tickerCallback = null
      }
      time.stop()
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler)
        resizeHandler = null
      }
      if (state.placeholder) {
        state.placeholder.geometry.dispose()
        state.placeholder.material.dispose()
        scene.remove(state.placeholder)
        state.placeholder = undefined
      }
      state.renderer?.dispose()
      state.renderer = undefined
      ready.value = false
    }

    function registerPage(page) {
      pages.add(page)
    }

    function unregisterPage(page) {
      pages.delete(page)
    }

    nuxtApp.provide('webgl', {
      enabled: true,
      scene,
      camera,
      // Getter — the renderer doesn't exist until WebGLCanvas mounts.
      // A plain property would lock in `undefined` at provide() time.
      get renderer() {
        return state.renderer
      },
      viewport,
      screen,
      time,
      ready,
      mount,
      unmount,
      registerPage,
      unregisterPage,
    })
  },
})

// Trailing-edge debounce keeps resize cheap while still firing once the
// browser settles. 150ms matches playfight's choice.
function debounce(fn, ms) {
  let timer = null
  return (...args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}
