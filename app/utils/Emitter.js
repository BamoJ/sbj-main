/**
 * Unified event system — class for inheritance, named singleton for
 * cross-layer signals.
 *
 * When to use this vs Nuxt's native hooks (`useNuxtApp().hooks`):
 *   - App-level signals (page transitions, preloader done, WebGL handoff):
 *     prefer `nuxtApp.hook('page:transition:start', cb)`. Awaitable,
 *     ties into Nuxt's built-in page lifecycle, no parallel bus.
 *   - Object-level events (a Time class ticking, a Canvas emitting 'ready'):
 *     extend this Emitter class. `useNuxtApp()` isn't reachable from
 *     deep non-Vue code anyway.
 *   - The singleton `emitter` instance: fallback for "I'm in a class far
 *     from setup() and need a global bus." Expect to use sparingly once
 *     Nuxt hooks are wired up.
 *
 * Usage as a class (Time, Canvas, etc.):
 *   class Time extends Emitter { ... }
 *   this.emit('tick')
 *
 * Usage as the cross-layer singleton:
 *   emitter.on('canvas:ready', cb)
 *   emitter.emit('canvas:ready', data)
 *
 * Namespace cleanup:
 *   emitter.on('tick', cb, 'myView')
 *   emitter.off('tick', null, 'myView')   // removes only that namespace
 */
export class Emitter {
  constructor() {
    this._events = {}
  }

  on(event, callback, namespace) {
    if (!event || !callback) return this
    if (!this._events[event]) this._events[event] = []
    this._events[event].push({ fn: callback, ns: namespace || null })
    return this
  }

  once(event, callback, namespace) {
    const wrapper = (data) => {
      callback(data)
      this.off(event, wrapper, namespace)
    }
    return this.on(event, wrapper, namespace)
  }

  off(event, callback, namespace) {
    if (!event) return this

    // Remove by namespace only
    if (!callback && namespace) {
      if (this._events[event]) {
        this._events[event] = this._events[event].filter((entry) => entry.ns !== namespace)
        if (!this._events[event].length) delete this._events[event]
      }
      return this
    }

    // Remove specific callback
    if (callback && this._events[event]) {
      this._events[event] = this._events[event].filter((entry) => entry.fn !== callback)
      if (!this._events[event].length) delete this._events[event]
      return this
    }

    // Remove all listeners for event
    delete this._events[event]
    return this
  }

  emit(event, data) {
    if (!this._events[event]) return this
    // Snapshot so listeners adding/removing during dispatch don't mutate iteration.
    const entries = [...this._events[event]]
    entries.forEach((entry) => entry.fn(data))
    return this
  }

  clear() {
    this._events = {}
    return this
  }
}

// Cross-layer singleton — named export (not default) so Nuxt auto-import
// picks it up as `emitter` without clashing with the `Emitter` class.
export const emitter = new Emitter()
