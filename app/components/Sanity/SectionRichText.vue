<script setup>
import { h } from 'vue'

defineProps({
  body: { type: Array, default: () => [] },
})
useAnims()

// Override Portable Text's default "normal" block so each paragraph carries
// data-anim itself. SplitText then targets each <p> directly — identical
// shape to a hand-written <p data-anim="paragraph"> on a page.
const components = {
  block: {
    normal: (_, { slots }) => h('p', { 'data-anim': 'paragraph' }, slots.default?.()),
  },
}
</script>

<template>
  <section class="w-full py-[12rem]">
    <Container>
      <div class="text-medium">
        <SanityContent :value="body" :components="components" />
      </div>
    </Container>
  </section>
</template>
