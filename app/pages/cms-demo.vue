<script setup>
// Demo route — proves the Sanity pipe works end-to-end.
// Delete or rename when promoting this pattern into real pages.
//
// Reads the page document with slug "demo" from the in-memory cache
// pre-loaded by plugins/sanity-prefetch.client.js at app boot. Sync —
// page.value is populated by the time this setup runs, so the hero <h1>
// is in the DOM with real text from the first frame the page mounts,
// and the transition's SplitText choreography fires cleanly.
//
// To see content: create a Page in the Studio with slug "demo" and add
// a few sections.

useSanitySeo('demo', {
  title: 'CMS Demo',
  description: 'Sanity CMS integration demo for the starter.',
  ogType: 'website',
})

const config = useRuntimeConfig().public
const wired = computed(() => !!config.sanity?.projectId)
const page = usePageData('demo')
</script>

<template>
  <div class="min-h-screen">
    <!-- v-show (not v-if) — both branches always mounted, only `display`
         toggles. v-if would unmount/remount on data load, and that DOM
         mutation mid-transition (mode: 'default' + Suspense) is what
         caused the "Cannot destructure property 'type' of 'vnode'" error. -->
    <div v-show="!wired || !page" class="p-16">
      <Container>
        <h1 class="text-display mb-8">{{ wired ? 'No demo page yet' : 'Sanity not wired' }}</h1>
      </Container>
    </div>

    <div v-show="wired && page">
      <CmsSections :sections="page?.sections ?? []" />
    </div>
  </div>
</template>
