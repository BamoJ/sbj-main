<script setup>
const columns = Array.from({ length: 12 }, (_, i) => i + 1)
const visible = ref(false)

const handleKeydown = (e) => {
  // Don't hijack the shortcut while typing in a field.
  const target = e.target
  if (
    target instanceof HTMLElement &&
    (target.matches('input, textarea, select') || target.isContentEditable)
  ) {
    return
  }
  // e.code is layout-independent (works on AZERTY/Dvorak too).
  if (e.shiftKey && e.code === 'KeyG') {
    e.preventDefault()
    visible.value = !visible.value
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div
    v-show="visible"
    aria-hidden="true"
    class="pointer-events-none fixed inset-0 z-9999"
  >
    <Container>
      <div class="grid h-full grid-cols-12 gap-gutter">
        <div
          v-for="value in columns"
          :key="value"
          class="h-screen w-full bg-red-500/10"
        ></div>
      </div>
    </Container>
  </div>
</template>
