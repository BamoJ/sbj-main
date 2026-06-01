import { LinearFilter, TextureLoader } from 'three'

// URL-keyed texture loader. Dedupes concurrent loads (second call returns the
// same Promise) and dedupes resolved textures (third call returns the cached
// instance). Disables mipmaps to keep dynamic image sizes cheap.
class TextureCache {
  constructor() {
    this.cache = new Map()
    this.pending = new Map()
    this.loader = new TextureLoader()
    this.loader.setCrossOrigin('anonymous')
  }

  load(src) {
    if (!src) return Promise.reject(new Error('TextureCache: no source provided'))

    const cached = this.cache.get(src)
    if (cached) return Promise.resolve(cached)

    const inflight = this.pending.get(src)
    if (inflight) return inflight

    const promise = new Promise((resolve, reject) => {
      this.loader.load(
        src,
        (texture) => {
          texture.generateMipmaps = false
          texture.minFilter = LinearFilter
          this.cache.set(src, texture)
          this.pending.delete(src)
          resolve(texture)
        },
        undefined,
        (err) => {
          console.error(`[TextureCache] Failed to load ${src}`, err)
          this.pending.delete(src)
          reject(err)
        },
      )
    })

    this.pending.set(src, promise)
    return promise
  }

  get(src) {
    return this.cache.get(src)
  }

  has(src) {
    return this.cache.has(src)
  }

  clear() {
    this.cache.forEach((texture) => texture.dispose())
    this.cache.clear()
    this.pending.clear()
  }
}

export const textureCache = new TextureCache()
