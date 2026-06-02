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
      <div class="grid grid-cols-12 py-4 items-start">
        <div class="w-[7vw]">
          <NuxtLink to="/"><Logo /></NuxtLink>
        </div>
        <div class="col-start-12 -col-end-2 flex flex-col items-end">
          <NavItem
            v-for="item in navItems"
            :key="item.path"
            class="relative flex flex-row gap-2 items-center"
          >
            <TextLink :to="item.path">
              {{ item.name }}
            </TextLink>
          </NavItem>
        </div>
      </div>
    </Container>
  </nav>
</template>
