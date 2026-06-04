import * as THREE from 'three'
import simFrag from './homeshaders/sim.frag.glsl?raw'

// Fullscreen pass — write every texel of the target each frame.
const SIM_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

// GPU particle physics via ping-pong float render targets. One texel per
// particle: RGBA = (posX, posY, velX, velY) in drawing-buffer pixels. Replaces
// the lab's per-frame CPU loop — the CPU only sets two uniforms per frame.
export class Simulation {
  constructor({ renderer, size, originData, seedData, config }) {
    this.renderer = renderer
    this.size = size

    const type = this._pickFloatType(renderer)

    // Per-particle home positions (read by the physics for return-to-origin).
    this.originTexture = new THREE.DataTexture(originData, size, size, THREE.RGBAFormat, THREE.FloatType)
    this.originTexture.needsUpdate = true

    // Initial state (pos = origin, vel = 0).
    this.seedTexture = new THREE.DataTexture(seedData, size, size, THREE.RGBAFormat, THREE.FloatType)
    this.seedTexture.needsUpdate = true

    this.rtA = this._makeTarget(size, type)
    this.rtB = this._makeTarget(size, type)

    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.material = new THREE.ShaderMaterial({
      vertexShader: SIM_VERT,
      fragmentShader: simFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uPrev: { value: this.seedTexture },
        uOrigin: { value: this.originTexture },
        uMouse: { value: new THREE.Vector2(-99999, -99999) },
        uHasImpulse: { value: 0 },
        uDistortionRadius: { value: config.distortionRadius },
        uForceStrength: { value: config.forceStrength },
        uMaxDisplacement: { value: config.maxDisplacement },
        uReturnForce: { value: config.returnForce },
        uDamping: { value: config.damping ?? 0.82 },
        uTime: { value: 0 },
        uFlowStrength: { value: config.flowStrength ?? 0 },
        uFlowScale: { value: config.flowScale ?? 0.004 },
      },
    })
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material)
    this.scene.add(this.quad)

    this.current = this.rtA
    this.next = this.rtB

    // Seed rtA from the seed texture (one rest-state physics step = identity).
    this._renderPass(this.seedTexture, this.current)
  }

  // Re-seed origins + snap positions after a resize.
  reseed(originData, seedData) {
    this.originTexture.image.data.set(originData)
    this.originTexture.needsUpdate = true
    this.seedTexture.image.data.set(seedData)
    this.seedTexture.needsUpdate = true
    this._renderPass(this.seedTexture, this.current)
  }

  update(mouse, hasImpulse, time) {
    this.material.uniforms.uMouse.value.copy(mouse)
    this.material.uniforms.uHasImpulse.value = hasImpulse ? 1 : 0
    this.material.uniforms.uTime.value = time
    this._renderPass(this.current.texture, this.next)
    const tmp = this.current
    this.current = this.next
    this.next = tmp
  }

  get texture() {
    return this.current.texture
  }

  _renderPass(inputTexture, target) {
    this.material.uniforms.uPrev.value = inputTexture
    const prevTarget = this.renderer.getRenderTarget()
    this.renderer.setRenderTarget(target)
    this.renderer.render(this.scene, this.camera)
    this.renderer.setRenderTarget(prevTarget)
  }

  _makeTarget(size, type) {
    return new THREE.WebGLRenderTarget(size, size, {
      type,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    })
  }

  // FloatType for exact pixel coords; HalfFloat fallback if the GPU can't render
  // to RGBA32F (rare on modern WebGL2 — costs precision past ~2048px).
  _pickFloatType(renderer) {
    const gl = renderer.getContext()
    const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
    if (isWebGL2 && gl.getExtension('EXT_color_buffer_float')) return THREE.FloatType
    console.warn('[Simulation] RGBA32F render targets unavailable — falling back to HalfFloat (minor precision loss).')
    return THREE.HalfFloatType
  }

  dispose() {
    this.rtA.dispose()
    this.rtB.dispose()
    this.originTexture.dispose()
    this.seedTexture.dispose()
    this.quad.geometry.dispose()
    this.material.dispose()
  }
}
