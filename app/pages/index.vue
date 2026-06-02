<script setup>
// One-page homepage / work index for the bamoj.com placeholder.
useSanitySeo('home', {
  title: 'Home',
  description:
    'The portfolio of Bamo.J® — a creative studio working at the intersection of design, motion, and code.',
  ogType: 'website',
})

// Site settings singleton — social links for the footer cell.
const { data: settings } = await useSanityQuery(groq`*[_type == "settings"][0]{
  socials[]{ label, url }
}`)

// Work index — all projects in Studio order (drag-to-reorder via orderRank).
const { data: projects } = await useSanityQuery(groq`*[_type == "project"] | order(orderRank){
  _id, title, role, year, url
}`)

// [data-anim] reveals (the hero <h1> is animated by the page transition).
useAnims()
</script>

<template>
  <div>
    <section class="relative">
      <img
        src="/images/texture.png"
        alt=""
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <Container class="flex h-screen min-h-screen flex-col">
        <div class="w-full flex-1 grid grid-cols-12 gap-gutter">
          <div class="relative w-full h-full col-start-8 col-end-[13]">
            <div class="w-full h-full flex flex-col pt-[10vh]">
              <div class="w-full flex flex-row items-center justify-between pb-[1em] relative">
                <span class="text-main">Selected Work</span>
                <span class="text-main">[10]</span>
                <div class="absolute bottom-0 w-full h-[5px]">
                  <div class="w-full h-full bg-current"></div>
                </div>
              </div>
              <div class="w-full h-full flex flex-row">
                <div class="w-full flex flex-col">
                  <component
                    :is="project.url ? 'a' : 'div'"
                    v-for="(project, i) in projects"
                    :key="project._id"
                    :href="project.url || undefined"
                    :target="project.url ? '_blank' : undefined"
                    :rel="project.url ? 'noopener noreferrer' : undefined"
                    class="grid grid-cols-5 w-full items-center gap-gutter pb-[1em] pt-[1em] relative"
                  >
                    <div class="project col-span-3 flex flex-row gap-[2.75em] items-start">
                      <span class="text-small mt-[0.1em]">{{ i + 1 }}</span>
                      <span class="text-medium">{{ project.title }}</span>
                    </div>

                    <span class="text-main col-span-1">{{ project.role }}</span>
                    <span class="text-main col-span-1">{{ project.year }}</span>
                    <div class="absolute bottom-0 w-full h-[1px] col-span-5">
                      <div class="w-full h-full bg-white opacity-10"></div>
                    </div>
                  </component>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="bottom w-full grid grid-cols-12 gap-gutter absolute bottom-0 left-0 pb-4">
          <div class="col-start-1">©2K26</div>
          <div class="col-start-5 flex flex-row gap-1">
            <span>Jkt</span>
            <span>/</span>
            <span>Bali</span>
          </div>
          <div class="col-start-8 flex flex-row gap-12">
            <TextLink v-for="social in settings?.socials" :key="social.url" :href="social.url">
              {{ social.label }}
            </TextLink>
          </div>
          <div class="col-start-12">Booking</div>
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
