import * as THREE from 'three'
import EventEmitter from './utils/EventEmitter'

// Base class for every WebGL page view — ported 1:1 from the lab
// (sbj-lab src/canvas/Page.js). A page owns a THREE.Group (`elements`) added to
// the shared scene, and the create/enter/leave/update/destroy lifecycle the
// Canvas drives. Subclasses implement createGeometry / createMaterials /
// createMeshes (and optionally load / onResize / update).
export class Page extends EventEmitter {
  constructor({ scene, camera, renderer, time }) {
    super()

    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.time = time
    this.elements = new THREE.Group()
    this.elements.visible = false
    this.isActive = false
    this.created = false
  }

  async load() {}

  create() {
    if (this.created) return
    this.createGeometry?.()
    this.createMaterials?.()
    this.createMeshes?.()
    this.scene.add(this.elements)
    this.created = true
    this.trigger('create')
  }

  onEnter(data) {
    this.elements.visible = true
    this.isActive = true
    this.transitionIn(data)
    this.trigger('enter', [data])
  }

  onLeave(data) {
    this.transitionOut(data)
    this.elements.visible = false
    this.isActive = false
    this.trigger('leave', [data])
  }

  // Optional per-view intro/outro choreography (parity with the lab's Page).
  // No-ops by default — override in a view (e.g. an image-plane page) to animate
  // its meshes in/out. The current Home view doesn't use them.
  transitionIn() {}
  transitionOut() {}

  onResize() {}

  update() {
    if (!this.isActive) return
    this.trigger('update', [this.time.elapsed, this.time.delta])
  }

  destroy() {
    this.elements.traverse((child) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(disposeMaterial)
        else disposeMaterial(child.material)
      }
    })
    this.scene.remove(this.elements)
    this.trigger('destroy')
  }
}

function disposeMaterial(material) {
  for (const key in material) {
    const value = material[key]
    if (value && typeof value === 'object' && typeof value.dispose === 'function' && value.isTexture) {
      value.dispose()
    }
  }
  material.dispose()
}
