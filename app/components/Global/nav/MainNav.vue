<script setup>
// One-pager nav: logo (back to top) + in-page anchor links. Add/remove
// anchors here as sections land on the landing page. When the site grows
// past a single page, swap these for route links (or drive from the Sanity
// `settings` singleton — see studio/schemas/documents/settings.ts).
// Hero-only homepage for now — no in-page sections to anchor to yet.
const navItems = []

// Menu panel open state — shared with the panel in index.vue via the same
// useState key (Nuxt's built-in cross-component reactive state).
const menuOpen = useState('menu:open', () => false)

// Live local time in Western Indonesian Time (WIB / GMT+7). Formatted in
// Asia/Jakarta regardless of the visitor's own timezone, so it always shows
// Bamo's local time. Refreshed every 10s (minute precision is enough).
const formatWIB = () =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
    .format(new Date())
    .replace(':', ' : ')

const time = ref(formatWIB())
let clock
onMounted(() => {
  clock = setInterval(() => (time.value = formatWIB()), 10_000)
})
onBeforeUnmount(() => clearInterval(clock))
</script>

<template>
  <nav class="mix-blend-exclusion fixed top-0 left-0 z-1000 flex w-full">
    <Container>
      <div class="grid grid-cols-12 py-4 gap-gutter items-start w-full">
        <div class="col-start-1 col-end-3 flex flex-col max-md:col-end-5">
          <h1 class="text-main">Studio•Bämo.J®</h1>
          <span class="text-small font-normal">*Semi Temporary Site</span>
        </div>
        <div class="col-start-5 flex flex-col max-md:hidden">
          <span>{{ time }}</span>
          <span class="text-small font-normal">(GMT+7)</span>
        </div>
        <div class="col-start-8 col-span-2 flex flex-col max-md:hidden">
          <span>Available for project</span>
          <span class="text-small">Sept / 2026</span>
        </div>
        <div
          class="col-start-11 col-span-2 flex flex-col items-end gap-1 max-md:col-start-5 max-md:col-end-[13]"
        >
          <button
            :aria-expanded="menuOpen"
            aria-controls="site-menu"
            class="menu_btn flex flex-col gap-2 cursor-pointer"
            @click="menuOpen = !menuOpen"
          >
            <span>More info</span>
            <div class="menu_btn_dot_wrap flex flex-row gap-1 items-start">
              <div class="menu_btn_cirlce"></div>
              <div class="menu_btn_cirlce"></div>
              <div class="menu_btn_cirlce"></div>
            </div>
          </button>
        </div>
      </div>
    </Container>
  </nav>
</template>

<style scoped>
.menu_btn_cirlce {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
}
</style>
