// Per-page WebGL lifecycle hook. Pages call `useWebGLPage('home')` in
// <script setup>; the composable registers a handle with the renderer and
// tears it down on unmount.
//
// OPTIONAL. The default WebGL is the placeholder mesh in the plugin — pages
// don't need to call this to see WebGL animate during transitions. Use this
// only when a page wants its own WebGL behaviour (custom uniforms via the
// handle, raycaster hover, mesh-flight, etc.).
export function useWebGLPage(name) {
  const canvas = useCanvas()

  if (!canvas.enabled) {
    return { name, enabled: false }
  }

  const handle = { name, update: undefined }
  canvas.registerPage(handle)
  emitter.emit('page:webgl:ready', { name })

  onUnmounted(() => {
    canvas.unregisterPage(handle)
    emitter.emit('page:webgl:destroy', { name })
  })

  return { name, enabled: true, handle }
}
