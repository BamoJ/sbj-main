<script setup>
// Hardcoded defaults below. Sanity overrides them: create a Page document
// with slug "home" + populated seo fields, and those values win at runtime.
// See .claude/skills/seo/SKILL.md.
useSanitySeo('home', {
  title: 'Home',
  description:
    'Studio•Bamo.J® — a creative studio building distinctive digital experiences with motion, type, and WebGL.',
  ogType: 'website',
})

// Drives the scroll-triggered paragraph reveals further down the page.
// The hero <h1> is animated by the page transition (see app.vue) via
// [data-hero-title], not on mount — so no bespoke gsap.context() here.
useAnims()

const pageTitle = ref('S•BJ Nuxanity Starter 2K26')
</script>

<template>
  <div>
    <section class="relative flex h-screen flex-col justify-end py-12">
      <NuxtImg
        src="/images/article_images06.webp"
        alt="Studio•Bamo.J® logo"
        class="absolute inset-0 h-full w-full object-cover"
      />
      <Container>
        <div class="flex flex-row justify-between">
          <h1 data-hero-title class="text-display max-w-[11ch] font-medium">
            {{ pageTitle }}
          </h1>
          <PageNumber>1</PageNumber>
        </div>
      </Container>
    </section>

    <section class="flex min-h-screen w-full items-end justify-start py-8">
      <Container>
        <div class="flex flex-col gap-[6rem]">
          <p data-anim="paragraph" class="max-w-[50ch] text-medium">
            We make games, interactive experiences, and whatever else we feel like. We make games,
            interactive experiences, and whatever else we feel like. We make games, interactive
            experiences, and whatever else we feel like. We make games, interactive experiences, and
            whatever else we feel like.
          </p>
          <p data-anim="paragraph" class="max-w-[50ch] text-medium">
            We make games, interactive experiences, and whatever else we feel like. We make games,
            interactive experiences, and whatever else we feel like. We make games, interactive
            experiences, and whatever else we feel like. We make games, interactive experiences, and
            whatever else we feel like.
          </p>
        </div>
      </Container>
    </section>
  </div>
</template>

<style scoped>
/* SplitText inserts `.line-mask` at runtime — scoped styles don't reach
   nodes that didn't exist at render time. `:deep()` pierces scope. */
h1 :deep(.line-mask) {
  padding-right: 0.1em;
}
</style>
