import * as THREE from 'three'
import Time from './utils/Time'
import { TransitionController } from './TransitionController'

// Canvas — the WebGL stage. Ported from the lab (sbj-lab src/canvas/index.js)
// with the adaptations the plan calls for:
//   1. Deferred mount() — the renderer is created/attached when the DOM
//      container exists (WebGLCanvas.vue onMounted), not in the constructor.
//   2. Time is driven by the shared gsap.ticker (the plugin calls time.tick());
//      Canvas still subscribes `time.on('tick', () => this.update())`.
//   3. The mobile bypass lives in the plugin — if Canvas is constructed at all,
//      WebGL is on.
//
// Pages are looked up in the registry by route name, lazily instantiated +
// loaded + created on first visit, then swapped in/out via onChange().
export default class Canvas {
  constructor(registry = {}) {
    this.enabled = true
    this.renderActive = true // paused below the viewport breakpoint (BG shown)
    this.time = new Time()

    this.createCamera()
    this.createScene()

    this.registry = registry
    this.pages = {}
    this.currentPage = null
    this.container = null
    this.renderer = null

    // Renders only fire once the renderer exists (after mount()).
    this.time.on('tick', () => this.update())
    this._onResize = this.onResize.bind(this)
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
    this.camera.position.z = 1
  }

  createScene() {
    this.scene = new THREE.Scene()
  }

  // Called by WebGLCanvas.vue once its container <div> is in the DOM.
  mount(container) {
    if (this.renderer) return
    this.container = container

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    // Pixel ratio BEFORE size — setSize derives the drawing buffer from the
    // current ratio, so setting it after would leave the buffer wrong.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(this.renderer.domElement)

    // Cross-page plane-flight engine (`$webgl.transition`). Dormant until a page
    // emits `webgl:transition:prepare`. See the `transition` skill.
    this.transition = new TransitionController(this)

    window.addEventListener('resize', this._onResize)
  }

  async onChange(pageName, data) {
    const Cls = this.registry[pageName]
    if (!Cls) {
      console.warn(`[Canvas] No page registered for "${pageName}"`)
      return
    }

    const prev = this.currentPage

    if (!this.pages[pageName]) {
      this.pages[pageName] = new Cls({
        scene: this.scene,
        camera: this.camera,
        renderer: this.renderer,
        time: this.time,
      })
    }

    const next = this.pages[pageName]

    if (!next.created) {
      if (next.load) await next.load()
      next.create()
    }

    if (prev && prev !== next) prev.onLeave?.(data)

    this.currentPage = next
    next.onEnter?.(data)
  }

  onResize() {
    if (!this.renderer) return
    const width = window.innerWidth
    const height = window.innerHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)

    this.currentPage?.onResize?.()
  }

  // Toggled by WebGLCanvas as the viewport crosses the breakpoint.
  setRenderActive(v) {
    this.renderActive = v
  }

  update() {
    // Paused below the breakpoint: skip sim + render entirely (no GPU cost while
    // the static BG is showing). State is preserved for an instant resume.
    if (!this.renderer || !this.renderActive) return
    this.currentPage?.update?.(this.time)
    this.renderer.render(this.scene, this.camera)
  }

  unmount() {
    this.time.stop()
    this.transition?.destroy()
    window.removeEventListener('resize', this._onResize)

    Object.values(this.pages).forEach((p) => {
      p.onLeave?.()
      p.destroy?.()
    })
    this.pages = {}
    this.currentPage = null

    if (this.renderer) {
      this.renderer.dispose()
      const el = this.renderer.domElement
      if (el?.parentNode) el.parentNode.removeChild(el)
      this.renderer = null
    }
  }
}
