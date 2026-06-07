import * as THREE from 'three'
import gsap from 'gsap'
import { Page } from '../Page'
import { Simulation } from './Simulation'
import renderVert from './homeshaders/render.vert.glsl?raw'
import renderFrag from './homeshaders/render.frag.glsl?raw'

// Home view — the SBJ logo as a particle field that reacts to the mouse.
// Ported from the lab (sbj-lab src/canvas/Home/home.js): the logo PNG is
// rasterized to one particle per opaque pixel. The lab ran the repulsion +
// return-to-origin physics on the CPU every frame; here that physics lives on
// the GPU (Simulation.js), so the CPU only updates two uniforms per frame.
export class Home extends Page {
  constructor(options) {
    super(options)

    this.config = {
      logoPath: '/images/texture-test.png',
      maxLogoWidth: 1000, // caps rasterization → bounds particle count
      logoColor: '#ffffff',
      distortionRadius: 1000, // mouse repulsion radius (px) — big = more roam, less precision
      forceStrength: 0.1,
      maxDisplacement: 500, // hard cap on roam — keeps the LOGO readable. ↑ = looser
      returnForce: 0.12, // spring-home strength — holds the shape
      damping: 0.9, // viscosity (gooey = high)
      flowStrength: 0, // ambient curl-noise drift OFF — interaction is hover-only (0 = off, skips the curl taps via the shader guard)
      flowScale: 0.0022, // eddy size (smaller = bigger, slower swirls)
      pointSize: 6.5,
      fit: 'cover', // 'cover' = fill screen, keep proportions (crop overflow) |
      //               'contain' = whole design visible (letterbox) | 'stretch' = warp to fill
      scale: 1.0, // zoom multiplier on top of the fit (1 = exact fit, >1 zooms in)
      alpha: 0.2, // overall particle opacity (matches the design)
    }

    this.mouse = new THREE.Vector2(-99999, -99999)
    this.animationCount = 0

    // Render-on-demand state. The sim + draw only run while one of these holds;
    // otherwise the logo is settled + static (flow is off) and we sleep — see
    // `needsRender` + `update()`. Canvas.update() reads `needsRender` to skip the draw.
    this._introActive = false // the gather tween is animating uniforms
    this._wakeFrames = 0 // force a few frames after a state change (enter/resize)

    this.count = 0
    this.simSize = 0
    this.relativePositions = []
  }

  async load() {
    let image
    try {
      image = await this._loadImage(this.config.logoPath)
    } catch (err) {
      console.warn(
        `[Home] logo failed to load (${this.config.logoPath}) — particles disabled until the asset exists.`,
        err,
      )
      this._buildEmpty()
      return
    }
    const { width, height } = this._getResolution()
    this._build(image, width, height)
  }

  createGeometry() {
    this.geometry = new THREE.BufferGeometry()
    // Dummy 'position' so THREE knows the vertex count; real position comes from
    // the simulation texture sampled via `ref` in the vertex shader.
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(this.count * 3), 3),
    )
    this.geometry.setAttribute(
      'ref',
      new THREE.BufferAttribute(this.refs, 2),
    )
    // Per-particle intro scatter offset (px) — the render lerps simPos → simPos+offset
    // via uProgress. Origins/sim untouched, so the resting logo is byte-identical.
    this.geometry.setAttribute(
      'aScatter',
      new THREE.BufferAttribute(this._buildScatter(), 2),
    )
    this.geometry.setDrawRange(0, this.count)
  }

  createMaterials() {
    const { width, height } = this._getResolution()
    const dpr = Math.min(window.devicePixelRatio, 2)

    this.colorTexture = new THREE.DataTexture(
      this.colorData,
      this.simSize,
      this.simSize,
      THREE.RGBAFormat,
      THREE.FloatType,
    )
    this.colorTexture.needsUpdate = true

    this.simulation = new Simulation({
      renderer: this.renderer,
      size: this.simSize,
      originData: this.originData,
      seedData: this.seedData,
      config: this.config,
    })

    this.material = new THREE.ShaderMaterial({
      vertexShader: renderVert,
      fragmentShader: renderFrag,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uPosition: { value: this.simulation.texture },
        uColor: { value: this.colorTexture },
        u_resolution: { value: new THREE.Vector2(width, height) },
        u_scale: { value: new THREE.Vector2(1, 1) }, // fill is baked into origins
        u_pointSize: { value: this.config.pointSize * dpr },
        // Start hidden — the preloader fades this in. uProgress defaults to 1 (logo at
        // rest, identical to before); the intro drives it 0→1 for the scatter→gather.
        uAlpha: { value: 0 },
        uProgress: { value: 1 },
      },
    })
  }

  // Armed at page-enter (while the preloader still covers the screen): put the render
  // in its fully-scattered state (uProgress = 0) at alpha 0, so the particles sit
  // invisibly dispersed the whole time the loader is up — the first visible frame is
  // scattered, never the assembled logo. The sim is left at rest (origins); the
  // scatter is purely the render offset, so nothing about the logo is disturbed.
  _armScatter() {
    if (!this.material) return
    this._introLock = true // ignore the mouse until the intro finishes
    this.animationCount = 0
    this.mouse.set(-99999, -99999)
    this.material.uniforms.uAlpha.value = 0 // invisible until released
    this.material.uniforms.uProgress.value = 0 // fully scattered
    this._armed = true
  }

  // Called by the preloader once the overlay has cleared. ONE tween drives the whole
  // gather: uProgress 0→1 lerps every particle from its scatter offset onto the logo.
  //   • duration = the ONLY speed knob
  //   • ease     = the ONLY easing knob (a true curve → smooth by definition)
  // At uProgress = 1 the render is exactly the sim position, so the mouse physics
  // resume untouched. Origins are never animated → proportion is exact.
  playIntro() {
    if (!this.material) return
    if (!this._armed) this._armScatter() // safety — guarantee a scattered start
    const u = this.material.uniforms

    this._introActive = true // keep the loop awake for the full gather tween
    const tl = gsap.timeline({
      onComplete: () => {
        this._introLock = false // hand the mouse back exactly when the gather ends
        this._armed = false
        this._introActive = false // gather done — allow sleep once the mouse settles
      },
    })
    tl.to(
      u.uAlpha,
      { value: this.config.alpha, duration: 0.6, ease: 'power1.out' },
      0,
    )
    tl.to(
      u.uProgress,
      { value: 1, duration: 2.0, ease: 'power3.out' },
      0,
    ) // ← speed + easing
    return tl
  }

  _buildScatter() {
    const MIN_FRAC = 0.3
    const MAX_FRAC = 0.7
    const { width, height } = this._getResolution()
    const base = Math.min(width, height)
    const arr = new Float32Array(this.count * 2)
    for (let i = 0; i < this.count; i++) {
      const ang = Math.random() * Math.PI * 2
      const mag =
        base * (MIN_FRAC + Math.random() * (MAX_FRAC - MIN_FRAC))
      arr[i * 2 + 0] = Math.cos(ang) * mag
      arr[i * 2 + 1] = Math.sin(ang) * mag
    }
    return arr
  }

  createMeshes() {
    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false // screen-space; never cull
    this.elements.add(this.points)
  }

  onEnter() {
    super.onEnter()

    // Arm the scatter NOW (preloader still covers the screen) so the particles sit
    // invisibly dispersed — the first visible frame is scattered, never the logo.
    this._armScatter()
    this._wakeFrames = 3 // draw the armed-scatter frame before sleeping

    this._onMouseMove = (e) => {
      if (this._introLock) return // intro gather owns the particles — ignore the mouse
      const rect = this.renderer.domElement.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 2
      this.mouse.x = (e.clientX - rect.left) * dpr
      this.mouse.y = (e.clientY - rect.top) * dpr
      this.animationCount = 300 // keep pushing for ~300 frames after the move
    }
    window.addEventListener('mousemove', this._onMouseMove, {
      passive: true,
    })
  }

  onLeave() {
    if (this._onMouseMove)
      window.removeEventListener('mousemove', this._onMouseMove)
    super.onLeave()
  }

  // Render-on-demand gate. Awake while the gather tween runs, while a mouse
  // impulse is still coasting (animationCount), or for a few frames after a state
  // change (enter/resize). Otherwise the logo is settled + static (flow is off),
  // so we sleep — Canvas.update() reads this to skip the draw, and update() below
  // skips the GPU sim pass. The last frame stays on screen until the next wake.
  get needsRender() {
    return this._introActive || this.animationCount > 0 || this._wakeFrames > 0
  }

  update() {
    if (!this.isActive || !this.simulation) return
    if (!this.needsRender) return // settled → skip the GPU sim pass (idle = ~0 cost)
    if (this._wakeFrames > 0) this._wakeFrames--

    const hasImpulse = this.animationCount > 0
    if (hasImpulse) this.animationCount--

    this.simulation.update(this.mouse, hasImpulse, this.time.seconds)
    // The current target swaps each step — re-point the render uniform.
    this.material.uniforms.uPosition.value = this.simulation.texture
  }

  onResize() {
    if (!this.simulation) return
    this._wakeFrames = 3 // draw the reseeded/recentered frame, then settle again
    const { width, height } = this._getResolution()
    this.material.uniforms.u_resolution.value.set(width, height)

    // Re-center origins (logo stays centered) and snap particles to them.
    this._recomputeOrigins(width, height)
    this.simulation.reseed(this.originData, this.seedData)

    // Re-roll the scatter offsets for the new canvas size (keeps the intro sized
    // correctly if a resize lands before/while it plays). Harmless after the intro.
    const scatter = this.geometry?.getAttribute('aScatter')
    if (scatter) {
      scatter.array.set(this._buildScatter())
      scatter.needsUpdate = true
    }
  }

  destroy() {
    if (this._onMouseMove)
      window.removeEventListener('mousemove', this._onMouseMove)
    this.simulation?.dispose()
    this.colorTexture?.dispose()
    super.destroy()
  }

  // ── internals ──────────────────────────────────────────────────────────

  _getResolution() {
    const el = this.renderer.domElement
    return { width: el.width, height: el.height } // drawing-buffer pixels (CSS × DPR)
  }

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  // Rasterize the logo, collect opaque pixels, then pack origin/seed/color data
  // into square textures (simSize × simSize) for the GPU simulation.
  _build(image, canvasW, canvasH) {
    const aspect = image.naturalWidth / image.naturalHeight
    let logoW = image.naturalWidth
    let logoH = image.naturalHeight
    if (logoW > this.config.maxLogoWidth) {
      logoW = this.config.maxLogoWidth
      logoH = Math.round(logoW / aspect)
    }
    this.logoW = logoW
    this.logoH = logoH

    const tempCanvas = document.createElement('canvas')
    const ctx = tempCanvas.getContext('2d', {
      willReadFrequently: true,
    })
    tempCanvas.width = logoW
    tempCanvas.height = logoH
    ctx.clearRect(0, 0, logoW, logoH)
    ctx.drawImage(image, 0, 0, logoW, logoH)
    const data = ctx.getImageData(0, 0, logoW, logoH).data

    const tint = this._hexToRgb(this.config.logoColor)

    const pixels = [] // { relX, relY, r, g, b, a }
    for (let iy = 0; iy < logoH; iy++) {
      for (let ix = 0; ix < logoW; ix++) {
        const idx = (iy * logoW + ix) * 4
        const a = data[idx + 3]
        if (a <= 10) continue
        pixels.push({
          relX: ix - logoW / 2,
          relY: iy - logoH / 2,
          r: (data[idx] / 255) * tint.r,
          g: (data[idx + 1] / 255) * tint.g,
          b: (data[idx + 2] / 255) * tint.b,
          a: a / 255,
        })
      }
    }

    this.count = pixels.length
    this.simSize = Math.max(1, Math.ceil(Math.sqrt(this.count)))
    const texels = this.simSize * this.simSize

    this.relativePositions = pixels.map((p) => ({
      x: p.relX,
      y: p.relY,
    }))
    this._pixels = pixels

    this.originData = new Float32Array(texels * 4)
    this.seedData = new Float32Array(texels * 4)
    this.colorData = new Float32Array(texels * 4)
    this.refs = new Float32Array(this.count * 2)

    this._recomputeOrigins(canvasW, canvasH) // fills originData + seedData

    for (let i = 0; i < this.count; i++) {
      const p = pixels[i]
      this.colorData[i * 4 + 0] = p.r
      this.colorData[i * 4 + 1] = p.g
      this.colorData[i * 4 + 2] = p.b
      this.colorData[i * 4 + 3] = p.a

      const col = i % this.simSize
      const row = Math.floor(i / this.simSize)
      this.refs[i * 2 + 0] = (col + 0.5) / this.simSize
      this.refs[i * 2 + 1] = (row + 0.5) / this.simSize
    }
  }

  // Origins are the logo pixels centered in the current canvas; seed = origins
  // at rest (velocity 0). Padding texels sit off-screen with alpha 0.
  _recomputeOrigins(canvasW, canvasH) {
    const cx = canvasW / 2
    const cy = canvasH / 2
    // Map the logo into the viewport. Baked into the positions — not just the
    // render — so mouse physics line up with what's on screen.
    const fx = canvasW / this.logoW
    const fy = canvasH / this.logoH
    let sx, sy
    if (this.config.fit === 'stretch') {
      sx = fx // warp to fill both axes (distorts proportions)
      sy = fy
    } else {
      // Uniform scale keeps the design's true proportions. cover = max (fills
      // screen, crops overflow); contain = min (whole design, letterboxed).
      const s =
        this.config.fit === 'contain'
          ? Math.min(fx, fy)
          : Math.max(fx, fy)
      sx = s
      sy = s
    }
    sx *= this.config.scale
    sy *= this.config.scale
    const n = this.count
    for (let i = 0; i < n; i++) {
      const rel = this.relativePositions[i]
      const px = cx + rel.x * sx
      const py = cy + rel.y * sy
      this.originData[i * 4 + 0] = px
      this.originData[i * 4 + 1] = py
      this.originData[i * 4 + 2] = 0
      this.originData[i * 4 + 3] = 1
      this.seedData[i * 4 + 0] = px
      this.seedData[i * 4 + 1] = py
      this.seedData[i * 4 + 2] = 0
      this.seedData[i * 4 + 3] = 0
    }
  }

  // Minimal valid (empty) dataset so create()/Simulation don't crash before the
  // logo asset exists. Renders nothing.
  _buildEmpty() {
    this.count = 0
    this.simSize = 1
    this.logoW = 1
    this.logoH = 1
    this.relativePositions = []
    this.originData = new Float32Array(4)
    this.seedData = new Float32Array(4)
    this.colorData = new Float32Array(4)
    this.refs = new Float32Array(0)
  }

  _hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return m
      ? {
          r: parseInt(m[1], 16) / 255,
          g: parseInt(m[2], 16) / 255,
          b: parseInt(m[3], 16) / 255,
        }
      : { r: 1, g: 1, b: 1 }
  }
}
