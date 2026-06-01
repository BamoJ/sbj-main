<script setup>
const props = defineProps({
  direction: {
    type: String,
    required: true,
    validator: (v) => ['prev', 'next'].includes(v),
  },
  disabled: { type: Boolean, default: false },
})

defineEmits(['click'])
</script>

<template>
  <button
    type="button"
    class="slider-arrow"
    :class="`slider-arrow--${direction}`"
    :disabled="disabled"
    :aria-label="direction === 'prev' ? 'Previous slide' : 'Next slide'"
    @click="$emit('click')"
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        v-if="direction === 'prev'"
        d="M15 18l-6-6 6-6"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        v-else
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<style scoped>
.slider-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid currentColor;
  border-radius: 9999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.slider-arrow:hover:not(:disabled) {
  transform: scale(1.05);
}

.slider-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.slider-arrow:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
</style>
