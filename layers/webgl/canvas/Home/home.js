import * as THREE from 'three'
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
      pointSize: 5,
      fit: 'cover', // 'cover' = fill screen, keep proportions (crop overflow) |
      //               'contain' = whole design visible (letterbox) | 'stretch' = warp to fill
      scale: 1.0, // zoom multiplier on top of the fit (1 = exact fit, >1 zooms in)
      alpha: 0.2, // overall particle opacity (matches the design)
    }

    this.mouse = new THREE.Vector2(-99999, -99999)
    this.animationCount = 0

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
    this.geometry.setAttribute('ref', new THREE.BufferAttribute(this.refs, 2))
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
        uAlpha: { value: this.config.alpha },
      },
    })
  }

  createMeshes() {
    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false // screen-space; never cull
    this.elements.add(this.points)
  }

  onEnter() {
    super.onEnter()

    this._onMouseMove = (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      this.mouse.x = (e.clientX - rect.left) * dpr
      this.mouse.y = (e.clientY - rect.top) * dpr
      this.animationCount = 300 // keep pushing for ~300 frames after the move
    }
    window.addEventListener('mousemove', this._onMouseMove, { passive: true })
  }

  onLeave() {
    if (this._onMouseMove) window.removeEventListener('mousemove', this._onMouseMove)
    super.onLeave()
  }

  update() {
    if (!this.isActive || !this.simulation) return

    const hasImpulse = this.animationCount > 0
    if (hasImpulse) this.animationCount--

    this.simulation.update(this.mouse, hasImpulse, this.time.seconds)
    // The current target swaps each step — re-point the render uniform.
    this.material.uniforms.uPosition.value = this.simulation.texture
  }

  onResize() {
    if (!this.simulation) return
    const { width, height } = this._getResolution()
    this.material.uniforms.u_resolution.value.set(width, height)

    // Re-center origins (logo stays centered) and snap particles to them.
    this._recomputeOrigins(width, height)
    this.simulation.reseed(this.originData, this.seedData)
  }

  destroy() {
    if (this._onMouseMove) window.removeEventListener('mousemove', this._onMouseMove)
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
    const ctx = tempCanvas.getContext('2d', { willReadFrequently: true })
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

    this.relativePositions = pixels.map((p) => ({ x: p.relX, y: p.relY }))
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
      const s = this.config.fit === 'contain' ? Math.min(fx, fy) : Math.max(fx, fy)
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
      ? { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 }
      : { r: 1, g: 1, b: 1 }
  }
}
