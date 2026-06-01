<script setup>
defineProps({
  current: { type: Number, required: true },
  total: { type: Number, required: true },
})

defineEmits(['go-to'])
</script>

<template>
  <div class="slider-pagination" role="tablist" aria-label="Slider pagination">
    <button
      v-for="i in total"
      :key="i - 1"
      type="button"
      role="tab"
      class="slider-pagination__dot"
      :class="{ 'is-active': current === i - 1 }"
      :aria-label="`Go to slide ${i}`"
      :aria-selected="current === i - 1 ? 'true' : 'false'"
      @click="$emit('go-to', i - 1)"
    />
  </div>
</template>

<style scoped>
.slider-pagination {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  padding-block: 1rem;
}

.slider-pagination__dot {
  width: 0.5rem;
  height: 0.5rem;
  padding: 0;
  border: 1px solid currentColor;
  border-radius: 9999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.slider-pagination__dot:hover {
  transform: scale(1.2);
}

.slider-pagination__dot.is-active {
  background: currentColor;
}

.slider-pagination__dot:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
</style>
