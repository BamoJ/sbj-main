<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  speed: { type: Number, default: 1 },
})
</script>

<template>
  <section class="w-full min-h-screen overflow-hidden py-16">
    <div
      class="text-display flex gap-[2ch] whitespace-nowrap"
      :style="{ animationDuration: `${20 / speed}s` }"
    >
      <span v-for="(item, i) in items" :key="i">{{ item }} ·</span>
    </div>
  </section>
</template>
