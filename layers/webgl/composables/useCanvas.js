// Thin accessor around `nuxtApp.$webgl`. Returns the disabled context shape
// (enabled: false) when running on mobile or with the layer absent at runtime,
// so destructuring at call sites never throws.
export function useCanvas() {
  const { $webgl } = useNuxtApp()
  return $webgl
}
