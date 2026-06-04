import { Mesh, PlaneGeometry } from 'three'
import { gsap } from 'gsap'
import { emitter } from '~/utils/Emitter'

// TransitionController — cross-page WebGL "plane flight" engine. Ported from
// sbj-starter-main src/canvas/TransitionController.js, adapted to the current
// Canvas. Owned by Canvas (`$webgl.transition`).
//
// A source page emits `webgl:transition:prepare` with a plane mesh on link click;
// this clones + stages it in the scene. The destination page's transition then
// calls `getFlightContext(rect)` and authors the flight on a GSAP timeline.
//
// Currently DORMANT — nothing emits `webgl:transition:prepare` yet (no plane page
// exists). The `pageTransition.js` flight hook is a no-op until then. See the
// `transition` skill.
const lerp = (a, b, t) => a + (b - a) * t

export class TransitionController {
  constructor(canvas) {
    this.canvas = canvas
    this.transitionMesh = null
    this._sourcePlane = null

    // Source-side hook — any page can stage a flight without a Canvas ref.
    this._onPrepare = (data) => {
      if (!this.canvas?.enabled) return
      if (!data?.mesh) return
      this.prepare(data.mesh, {
        startPosition: data.startPosition,
        targetUrl: data.targetUrl,
        sourcePage: data.sourcePage,
      })
    }
    emitter.on('webgl:transition:prepare', this._onPrepare)
  }

  // True when a mesh is staged and waiting for the destination to fly it.
  get staged() {
    return !!this.transitionMesh
  }

  prepare(mesh, opts = {}) {
    if (!mesh) return this
    if (this.transitionMesh) this.cleanup()
    this._stage(mesh, opts)
    return this
  }

  // `rect` is the destination element's bounding rect (from `[data-gl-target]`).
  // Returns null when no flight is staged — caller falls back to a DOM-only timeline.
  getFlightContext(rect) {
    if (!this.transitionMesh || !rect) return null

    const screen = { width: window.innerWidth, height: window.innerHeight }
    const viewport = this._viewportSize()

    const world = {
      x: ((rect.left + rect.width / 2) / screen.width) * viewport.width - viewport.width / 2,
      y: viewport.height / 2 - ((rect.top + rect.height / 2) / screen.height) * viewport.height,
      width: (rect.width / screen.width) * viewport.width,
      height: (rect.height / screen.height) * viewport.height,
    }

    const startW = this.transitionMesh.geometry.parameters.width * this.transitionMesh.scale.x
    const startH = this.transitionMesh.geometry.parameters.height * this.transitionMesh.scale.y
    const sizeProxy = { width: startW, height: startH, progress: 0 }

    const onSizeUpdate = () => {
      const old = this.transitionMesh.geometry
      this.transitionMesh.geometry = new PlaneGeometry(sizeProxy.width, sizeProxy.height, 64, 64)
      const img = this.transitionMesh.userData.img
      if (img?.naturalWidth && img?.naturalHeight) this._correctUVs(img, sizeProxy)
      this.transitionMesh.scale.set(1, 1, 1)
      old.dispose()
    }

    return {
      mesh: this.transitionMesh,
      uniforms: this.transitionMesh.material.uniforms,
      sizeProxy,
      onSizeUpdate,
      world,
      cleanup: () => this.cleanup(),
    }
  }

  cleanup() {
    if (!this.transitionMesh) return
    this.canvas.scene.remove(this.transitionMesh)
    this.transitionMesh.geometry.dispose()
    this.transitionMesh.material.dispose()
    if (this._sourcePlane) this._sourcePlane.visible = true
    this.transitionMesh = null
    this._sourcePlane = null
  }

  destroy() {
    emitter.off('webgl:transition:prepare', this._onPrepare)
    this.cleanup()
  }

  // ── Internals ──────────────────────────────────────────────────────────

  _stage(sourcePlane, opts) {
    const { startPosition } = opts

    const clonedMaterial = sourcePlane.material.clone()
    clonedMaterial.transparent = true

    const srcUniforms = sourcePlane.material.uniforms
    if (srcUniforms?.uOpacity) {
      gsap.killTweensOf(srcUniforms.uOpacity)
      srcUniforms.uOpacity.value = 1
    }

    // Clone uniforms by value so the flight can mutate ctx.uniforms freely.
    if (srcUniforms) {
      Object.keys(srcUniforms).forEach((key) => {
        if (!clonedMaterial.uniforms[key]) return
        const v = srcUniforms[key].value
        if (v && typeof v === 'object' && v.clone) clonedMaterial.uniforms[key].value = v.clone()
        else if (v && typeof v === 'object') clonedMaterial.uniforms[key].value = { ...v }
        else clonedMaterial.uniforms[key].value = v
      })
    }
    if (clonedMaterial.uniforms.uOpacity) clonedMaterial.uniforms.uOpacity.value = 1

    this.transitionMesh = new Mesh(sourcePlane.geometry, clonedMaterial)
    this.transitionMesh.position.copy(sourcePlane.position)
    this.transitionMesh.scale.set(1, 1, 1)
    this.transitionMesh.rotation.copy(sourcePlane.rotation)

    if (startPosition && Number.isFinite(startPosition.x) && Number.isFinite(startPosition.y)) {
      this.transitionMesh.position.x = startPosition.x
      this.transitionMesh.position.y = startPosition.y
    }

    this.transitionMesh.userData = { ...sourcePlane.userData }
    this.canvas.scene.add(this.transitionMesh)
    this.transitionMesh.visible = true
    sourcePlane.visible = false
    this._sourcePlane = sourcePlane

    // Pre-flight interaction reset — opt-in per uniform (custom shaders no-op).
    const u = this.transitionMesh.material.uniforms
    const prepTl = gsap.timeline()
    if (u?.uHover) {
      gsap.killTweensOf(u.uHover)
      prepTl.to(u.uHover, { value: 0, duration: 0.1, ease: 'power2.out' }, 0)
    }
    if (u?.uOffset?.value)
      prepTl.to(u.uOffset.value, { x: 0, y: 0, duration: 0.1, ease: 'power2.out' }, 0)
    if (u?.uMouseVelocity?.value)
      prepTl.to(u.uMouseVelocity.value, { x: 0, y: 0, duration: 0.5, ease: 'power2.out' }, 0)
    if (u?.uReveal) prepTl.to(u.uReveal, { value: 1.0, duration: 0.1, ease: 'power2.out' }, 0)
    if (u?.uWaveIntensity)
      prepTl.to(u.uWaveIntensity, { value: 0, duration: 0.1, ease: 'power2.out' }, 0)
    if (u?.uPageTransition) u.uPageTransition.value = 0
  }

  _viewportSize() {
    const cam = this.canvas.camera
    const fov = cam.fov * (Math.PI / 180)
    const height = 2 * Math.tan(fov / 2) * cam.position.z
    const width = height * cam.aspect
    return { width, height }
  }

  _correctUVs(img, sizeProxy) {
    const imgAspect = img.naturalWidth / img.naturalHeight
    const targetAspect = sizeProxy.width / sizeProxy.height

    let idealUScale = 1
    let idealVScale = 1
    let idealUOffset = 0
    let idealVOffset = 0

    if (imgAspect > targetAspect) {
      const visibleU = targetAspect / imgAspect
      idealUOffset = (1 - visibleU) / 2
      idealUScale = visibleU
    } else {
      const visibleV = imgAspect / targetAspect
      idealVOffset = (1 - visibleV) / 2
      idealVScale = visibleV
    }

    const p = sizeProxy.progress
    const shaderZoom = this.transitionMesh.userData.shaderZoom || 1.0

    const uOffset = idealUOffset * p
    const vOffset = idealVOffset * p
    const uScale = lerp(1, idealUScale, p)
    const vScale = lerp(1, idealVScale, p)

    const startComp = 1.0
    const endComp = 1.0 / shaderZoom
    const compensation = lerp(startComp, endComp, p)

    const uvs = this.transitionMesh.geometry.attributes.uv
    for (let i = 0; i < uvs.count; i++) {
      const u = uvs.getX(i)
      const v = uvs.getY(i)
      let newU = uOffset + u * uScale
      let newV = vOffset + v * vScale
      newU = (newU - 0.5) * compensation + 0.5
      newV = (newV - 0.5) * compensation + 0.5
      uvs.setXY(i, newU, newV)
    }
    uvs.needsUpdate = true
  }
}
