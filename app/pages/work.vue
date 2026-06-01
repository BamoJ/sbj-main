<script setup>
import Slider from '~/components/UI/slider/Slider.vue'
import SliderArrow from '~/components/UI/slider/SliderArrow.vue'
import SliderPagination from '~/components/UI/slider/SliderPagination.vue'

useSanitySeo('work', {
  title: 'Work',
  description:
    'Selected work from Studio•Bamo.J® — case studies, awarded projects, and ongoing experiments.',
  ogType: 'website',
})

useAnims()

// Starter demo data — replace with CMS-driven items per project.
const sliderItems = [
  { image: '/images/article_images01.webp', title: 'Project One' },
  { image: '/images/article_images02.webp', title: 'Project Two' },
  { image: '/images/article_images03.webp', title: 'Project Three' },
  { image: '/images/article_images04.webp', title: 'Project Four' },
  { image: '/images/article_images05.webp', title: 'Project Five' },
  { image: '/images/article_images06.webp', title: 'Project Six' },
  { image: '/images/image-1.webp', title: 'Project Seven' },
  { image: '/images/image-2.webp', title: 'Project Eight' },
]

// Slider state lifted into the page so chrome can live anywhere in the layout.
const sliderRef = ref(null)
const currentSlide = ref(0)
</script>

<template>
  <div>
    <section class="flex h-screen w-full flex-col justify-end py-12 relative">
      <NuxtImg
        src="/images/image-2.webp"
        alt="Work hero image"
        class="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <Container>
        <div class="flex min-h-full w-full flex-row justify-between">
          <h1 data-hero-title class="text-display">
            And stuff like
            <br />
            Slipknot, I guess
          </h1>
          <PageNumber>3</PageNumber>
        </div>
      </Container>
    </section>

    <section class="w-full">
      <Container class="h-screen">
        <div class="flex min-h-full w-full flex-col justify-center py-8">
          <p data-anim="paragraph" class="max-w-[50ch] text-medium">
            Count me out like sovereigns, payback for the good times Right foot in the roses, left
            foot on a landmine I’m not gonna be there tripping on the grapevine They can sing the
            words while I cry into the bassline, Wear me out like Prada, devil in my detailI swear
            it’s getting harder even just to exhale Backed up into corners, bitter in the lens I’m
            sick of trying to hide it every time they take mine
          </p>
        </div>
      </Container>
    </section>
    <!-- Starter slider demo — engine only. Chrome (arrows/dots) composed
         externally so each project can place them anywhere in the layout.
         `overflow-hidden` here clips smooothy's infinite-loop wraparound
         flight path (slides teleporting from far-left to far-right) so the
         user only ever sees the legit slide layout, not the bookkeeping. -->
    <section class="w-full py-24 overflow-hidden">
      <Slider
        ref="sliderRef"
        :items="sliderItems"
        :infinite="true"
        :snap="true"
        :slides-per-view="3.5"
        slide-gap=".5rem"
        :centered="true"
        @slide-change="(cur) => (currentSlide = cur)"
      >
        <template #default="{ item, index, isActive }">
          <li class="slider-demo-slide" :class="{ 'is-active': isActive }">
            <NuxtImg :src="item.image" :alt="item.title" class="slider-demo-slide__img" />
            <h3 class="slider-demo-slide__title text-medium">{{ index + 1 }}. {{ item.title }}</h3>
          </li>
        </template>
      </Slider>

      <Container class="mt-12 flex items-center justify-center gap-6">
        <SliderArrow direction="prev" @click="sliderRef?.goToPrev()" />
        <SliderPagination
          :current="currentSlide"
          :total="sliderItems.length"
          @go-to="(i) => sliderRef?.goToIndex(i)"
        />
        <SliderArrow direction="next" @click="sliderRef?.goToNext()" />
      </Container>
    </section>
  </div>
</template>

<style scoped>
.slider-demo-slide {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex-shrink: 0;
  width: var(--slide-w);
  padding-inline: var(--slide-gap);
  user-select: none;
  -webkit-user-select: none;
  /* Opacity falloff based on --slide-distance (set by the slider each frame).
     DO NOT add `transform` or `transition: transform` here — smooothy sets
     `style.transform` directly on this element; any CSS transform would be
     overridden, and a CSS transition on transform would animate smooothy's
     instant wraparound jumps across the viewport. Apply scale-on-active
     effects to inner elements (e.g., .slider-demo-slide__img). */
  opacity: calc(1 - min(abs(var(--slide-distance, 0)), 1) * 0.5);
  transition: opacity 0.15s linear;
}

.slider-demo-slide :where(img, video) {
  -webkit-user-drag: none;
  user-select: none;
  pointer-events: none;
}

.slider-demo-slide__img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  /* Scale lives on the INNER image (smooothy doesn't touch this element).
     Falloff with --slide-distance: 0 at center, ±1 at neighbors. */
  transform: scale(calc(1 - min(abs(var(--slide-distance, 0)), 1) * 0.15));
  transform-origin: center;
  transition: transform 0.15s linear;
}

.slider-demo-slide__title {
  margin-top: 1.5rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.slider-demo-slide.is-active .slider-demo-slide__title {
  opacity: 1;
}
</style>
