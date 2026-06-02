<script setup>
// One-pager nav: logo (back to top) + in-page anchor links. Add/remove
// anchors here as sections land on the landing page. When the site grows
// past a single page, swap these for route links (or drive from the Sanity
// `settings` singleton — see studio/schemas/documents/settings.ts).
// Hero-only homepage for now — no in-page sections to anchor to yet.
const navItems = []
</script>

<template>
  <nav class="mix-blend-exclusion fixed top-0 left-0 z-1000 flex w-full">
    <Container>
      <div class="grid grid-cols-12 py-4 gap-gutter items-start w-full">
        <div class="w-[7vw] col-start-1 col-end-3">
          <NuxtLink to="/"><Logo /></NuxtLink>
        </div>
        <div class="col-start-5 flex flex-col max-md:hidden">
          <span>12 : 15 AM</span>
          <span class="text-small">(GMT+7)</span>
        </div>
        <div class="col-start-8 col-span-2 flex flex-col max-md:hidden">
          <span>Available for project</span>
          <span class="text-small">Sept / 2026</span>
        </div>
        <div class="col-start-11 col-span-2 flex flex-col items-end gap-1">
          <button class="menu_btn flex flex-col gap-2 cursor-pointer">
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
