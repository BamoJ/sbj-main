// Thin accessor around `nuxtApp.$webgl` — the Canvas instance (or the disabled
// stub on mobile / layer-off). Call methods on the returned object directly
// (`useWebGL().onChange(name)`); don't destructure them, or class methods lose
// their `this` binding.
export function useWebGL() {
  const { $webgl } = useNuxtApp()
  return $webgl
}
