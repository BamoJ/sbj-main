<script setup>
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(SplitText)

defineProps({
  eyebrow: String,
  headline: String,
  media: Object,
})

onMounted(() => {})

onUnmounted(() => {})
</script>

<template>
  <section ref="root" class="relative h-screen w-full overflow-hidden bg-neutral-900">
    <SanityImage
      v-if="media?.asset?._ref"
      :asset-id="media.asset._ref"
      auto="format"
      :w="2400"
      class="hero-image absolute inset-0 h-full w-full object-cover"
    />
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/60 to-transparent"
    />
    <Container
      class="relative z-10 grid min-h-full min-w-full grid-cols-12 content-end pb-[4rem] text-white"
    >
      <p v-if="eyebrow" class="hero-eyebrow mt-2 col-start-1 col-end-2 text-medium mb-4 opacity-80">
        {{ eyebrow }}
      </p>
      <h1 data-hero-title class="col-start-2 col-end-12 text-display max-w-[11ch] ml-3">
        {{ headline }}
      </h1>
    </Container>
  </section>
</template>

<style scoped>
/* SplitText inserts `.line-mask` at runtime — scoped styles don't reach
   nodes that didn't exist at render time. `:deep()` pierces scope. */
h1 :deep(.line-mask) {
  padding-right: 0.1em;
}
</style>
