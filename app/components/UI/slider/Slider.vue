<script setup>
// Slider engine — matches smooothy's official demo pattern.
// The component renders ONLY the <ul> wrapper. The caller writes the <li>
// slides via the default slot, owning markup + styling completely.
//
// Centering uses `margin-left: calc(50% - var(--slide-w)/2 - var(--slide-gap))`
// on the wrapper — NOT a transform — so page transitions don't interact with
// it via compositor layers / stacking contexts.
const props = defineProps({
  items: { type: Array, default: () => [] },

  // Layout. Caller's slide CSS uses var(--slide-w) / var(--slide-gap).
  // slidesPerView = the convenience: "show N slides at once" → --slide-w = 100%/N
  // slideWidth = an explicit CSS length override ('320px', '22vw', etc.); when set, wins over slidesPerView
  slidesPerView: { type: Number, default: 1 },
  slideWidth: { type: String, default: undefined },
  slideGap: { type: String, default: '0px' },
  centered: { type: Boolean, default: false },

  // Motion
  infinite: { type: Boolean, default: true },
  snap: { type: Boolean, default: true },
  vertical: { type: Boolean, default: false },
  lerpFactor: { type: Number, default: undefined },
  snapStrength: { type: Number, default: undefined },

  // Input
  scrollInput: { type: Boolean, default: false },
  keyboard: { type: Boolean, default: true },

  // Behavior
  autoplay: { type: Number, default: 0 },
})

const emit = defineEmits(['slide-change', 'update'])

const wrapperEl = ref(null)

const { currentSlide, progress, speed, goToNext, goToPrev, goToIndex, setPaused } = useSmoothy(
  wrapperEl,
  {
    infinite: props.infinite,
    snap: props.snap,
    vertical: props.vertical,
    scrollInput: props.scrollInput,
    ...(props.lerpFactor !== undefined && { lerpFactor: props.lerpFactor }),
    ...(props.snapStrength !== undefined && { snapStrength: props.snapStrength }),
    onSlideChange: (cur, prev) => emit('slide-change', cur, prev),
    onUpdate: (core) => {
      // Per-slide CSS var for frame-continuous styling (scale / opacity / blur
      // driven by distance from center). Iterate wrapper.children directly —
      // same elements smooothy operates on.
      const pv = core.parallaxValues
      const children = wrapperEl.value?.children
      if (pv && children) {
        for (let i = 0; i < children.length; i++) {
          children[i].style.setProperty('--slide-distance', pv[i] ?? 0)
        }
      }
      emit('update', {
        speed: core.speed,
        progress: core.progress,
        parallaxValues: pv,
      })
    },
  },
)

// Keyboard navigation when the slider is focused.
function onKeydown(e) {
  if (!props.keyboard) return
  const nextKey = props.vertical ? 'ArrowDown' : 'ArrowRight'
  const prevKey = props.vertical ? 'ArrowUp' : 'ArrowLeft'
  if (e.key === nextKey) {
    e.preventDefault()
    goToNext()
  } else if (e.key === prevKey) {
    e.preventDefault()
    goToPrev()
  }
}

// Autoplay — pauses on user input, resumes on release.
let autoplayTimer = null
function startAutoplay() {
  if (!props.autoplay) return
  stopAutoplay()
  autoplayTimer = setInterval(() => goToNext(), props.autoplay)
}
function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer)
    autoplayTimer = null
  }
}
onMounted(() => startAutoplay())
onBeforeUnmount(() => stopAutoplay())

// CSS variables passed down so the caller's slide CSS can size against them.
// slideWidth (when set) wins over slidesPerView.
const cssVars = computed(() => ({
  '--slide-w': props.slideWidth ?? `calc(100% / ${props.slidesPerView})`,
  '--slide-gap': props.slideGap,
}))

// Expose state + control surface for the parent to compose chrome anywhere.
//   <Slider ref="sliderRef" ... />
//   <button @click="sliderRef?.goToNext()">→</button>
defineExpose({
  currentSlide,
  progress,
  speed,
  total: computed(() => props.items.length),
  goToNext,
  goToPrev,
  goToIndex,
  setPaused,
})
</script>

<template>
  <ul
    ref="wrapperEl"
    class="slider"
    :class="{ 'slider--vertical': vertical, 'slider--centered': centered }"
    :style="cssVars"
    :tabindex="keyboard ? 0 : -1"
    @keydown="onKeydown"
    @pointerdown="stopAutoplay"
    @pointerup="startAutoplay"
  >
    <template v-for="(item, index) in items" :key="index">
      <slot
        :item="item"
        :index="index"
        :is-active="currentSlide === index"
        :total="items.length"
      />
    </template>
  </ul>
</template>

<style scoped>
.slider {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  /* Explicit width: 100% so the `margin-left` we apply for centering doesn't
     shrink the wrapper's auto-width (which would make var(--slide-w)'s
     `calc(100% / N)` resolve against a smaller box and offset every slide). */
  width: 100%;
  outline: none;
  touch-action: pan-y;
}

.slider--centered {
  margin-left: calc(50% - var(--slide-w) / 2);
}

.slider--vertical {
  flex-direction: column;
  touch-action: pan-x;
}

.slider--vertical.slider--centered {
  margin-left: 0;
  margin-top: calc(50% - var(--slide-w) / 2);
}
</style>
