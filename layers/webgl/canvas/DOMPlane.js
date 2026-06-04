import { Group, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three'
import vertexShader from './shaders/defaultVert.glsl?raw'
import fragmentShader from './shaders/defaultFrag.glsl?raw'

// DOMPlane — helper for mapping DOM elements to WebGL planes (ported from
// sbj-starter-main src/canvas/DOMPlane.js). It is NOT a registry view; a `Page`
// subclass composes it (the starter's `Home` page did `HomeView extends DOMPlane`).
//
// Self-contained: computes the world viewport from the camera + window so a page
// can just do `new DOMPlane({ parent: this.elements, camera: this.camera })`,
// `createPlane(texture, el)` per `[data-gl="img"]`, then call `update(delta)` each
// frame and `destroy()` on leave.
//
// Currently dormant — nothing in the app uses it yet. See the `dom-plane` skill.
const lerp = (a, b, t) => a + (b - a) * t

export class DOMPlane {
  constructor({ parent, camera }) {
    this.parent = parent // a THREE.Group/Scene to add planes into
    this.camera = camera
    this.imagePlanes = []
    this.imageGroup = new Group()
    this.parent.add(this.imageGroup)
    this.abortController = new AbortController()
    this.viewport = { width: 0, height: 0 }
    this.screen = { width: 0, height: 0 }
    this._computeViewport()
  }

  // World-space viewport at z=0 (CSS-pixel → world mapping). Mirrors the camera
  // FOV math the rest of the layer uses.
  _computeViewport() {
    this.screen.width = window.innerWidth
    this.screen.height = window.innerHeight
    const fov = this.camera.fov * (Math.PI / 180)
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z
    const width = height * (this.screen.width / this.screen.height)
    this.viewport.width = width
    this.viewport.height = height
  }

  // Build a plane sized + positioned to a DOM element. `texture` is pre-loaded
  // (e.g. via TextureCache) by the caller.
  createPlane(texture, el, index = 0) {
    const bounds = el.getBoundingClientRect()
    const width = (bounds.width / this.screen.width) * this.viewport.width
    const height = (bounds.height / this.screen.height) * this.viewport.height

    const geometry = new PlaneGeometry(width, height, 32, 32)
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: texture },
        uOpacity: { value: 1 },
        uOffset: { value: new Vector2(0, 0) },
        uMouseVelocity: { value: new Vector2(0, 0) },
        uReveal: { value: 1 },
        uPageTransition: { value: 0 },
      },
    })

    const mesh = new Mesh(geometry, material)
    mesh.userData = {
      index,
      img: el,
      isHovered: false,
      targetMouseUV: new Vector2(),
      targetWorldPos: new Vector2(),
      worldPos: null,
    }
    this.imagePlanes.push(mesh)
    this.imageGroup.add(mesh)
    this.updatePlanePosition(mesh)
    return mesh
  }

  // Hover (override onHoverEnter/onHoverLeave to animate uniforms). `containerSelector`
  // is the hover area around the element (e.g. '[data-gl-container]').
  setupHoverListeners(mesh, el, containerSelector) {
    const container = el.closest(containerSelector) || el
    const signal = this.abortController.signal
    container.addEventListener('mouseenter', () => this.onHoverEnter(mesh), { signal })
    container.addEventListener('mouseleave', () => this.onHoverLeave(mesh), { signal })
    container.addEventListener('mousemove', (e) => {
      if (!mesh.userData.isHovered) return
      const b = container.getBoundingClientRect()
      mesh.userData.targetMouseUV.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1)
      const worldX = (e.clientX / this.screen.width) * this.viewport.width - this.viewport.width / 2
      const worldY = this.viewport.height / 2 - (e.clientY / this.screen.height) * this.viewport.height
      mesh.userData.targetWorldPos.set(worldX, worldY)
    }, { signal })
  }

  onHoverEnter() {}
  onHoverLeave() {}

  updatePlanePosition(plane) {
    if (plane.userData.worldPos) return // hovered planes drive their own position
    const bounds = plane.userData.img.getBoundingClientRect()
    if (bounds.width === 0 || bounds.height === 0) return
    plane.position.set(this.updateX(bounds.left, bounds.width), this.updateY(bounds.top, bounds.height), 0)
  }

  updateX(left, width) {
    return ((left + width / 2) / this.screen.width) * this.viewport.width - this.viewport.width / 2
  }

  updateY(top, height) {
    return this.viewport.height / 2 - ((top + height / 2) / this.screen.height) * this.viewport.height
  }

  // Call every frame from the owning page's update().
  update(delta = 16) {
    this.imagePlanes.forEach((plane) => this.updatePlanePosition(plane))
    this._updateHovered(delta)
  }

  _updateHovered(delta) {
    this.imagePlanes.forEach((plane) => {
      const u = plane.material.uniforms
      if (u.uTime) u.uTime.value += delta * 0.001

      if (plane.userData.isHovered) {
        const current = plane.userData.worldPos || { x: plane.position.x, y: plane.position.y }
        const target = plane.userData.targetWorldPos
        const ease = 0.09
        current.x = lerp(current.x, target.x, ease)
        current.y = lerp(current.y, target.y, ease)
        plane.userData.worldPos = current
        plane.position.x = current.x
        plane.position.y = current.y
        const vx = target.x - current.x
        const vy = target.y - current.y
        u.uOffset.value.set(vx * 0.2, vy * 0.3)
        u.uMouseVelocity.value.set(vx / this.viewport.width, vy / this.viewport.height)
      }
      else {
        u.uOffset.value.set(0, 0)
        u.uMouseVelocity.value.set(0, 0)
      }
    })
  }

  onResize() {
    this._computeViewport()
    this.imagePlanes.forEach((plane) => {
      const b = plane.userData.img.getBoundingClientRect()
      if (b.width === 0 || b.height === 0) return
      const width = (b.width / this.screen.width) * this.viewport.width
      const height = (b.height / this.screen.height) * this.viewport.height
      plane.geometry.dispose()
      plane.geometry = new PlaneGeometry(width, height, 32, 32)
    })
  }

  show() { this.imageGroup.visible = true }
  hide() { this.imageGroup.visible = false }

  destroy() {
    this.abortController.abort()
    this.imagePlanes.forEach((p) => {
      p.geometry.dispose()
      p.material.dispose()
    })
    this.imagePlanes = []
    this.parent.remove(this.imageGroup)
  }
}
