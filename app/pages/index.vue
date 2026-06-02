<script setup>
// One-page homepage / work index for the bamoj.com placeholder.
useSanitySeo('home', {
  title: 'Home',
  description:
    'The portfolio of Bamo.J® — a creative studio working at the intersection of design, motion, and code.',
  ogType: 'website',
})

// [data-anim] reveals (the hero <h1> is animated by the page transition).
useAnims()
</script>

<template>
  <div>
    <section class="relative flex min-h-screen flex-col justify-end py-2">
      <img
        src="/images/texture.png"
        alt=""
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <Container class="relative z-10">
        <div class="grid grid-cols-12 w-full gap-gutter">
          <div class="col-start-1">©2K26</div>
          <div class="col-start-4 flex flex-row">
            <span>JKT</span>
            <span>Bali</span>
          </div>
          <div class="col-start-8"></div>
          <div class="col-start-11">Booking</div>
        </div>
      </Container>
    </section>
  </div>
</template>

<style scoped>
/* SplitText inserts `.line-mask` at runtime — :deep() pierces scope. */
h1 :deep(.line-mask) {
  padding-right: 0.1em;
}
</style>
