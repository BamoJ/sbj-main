<script setup>
import { pageTransition } from '~/transitions/pageTransition'

// First call initializes the singleton; lives in app.vue so it survives
// route changes — one Lenis instance for the entire site.
useLenis()

// Perf overlay (Shift+F) — dev only, never ships to prod.
const dev = import.meta.dev
</script>

<template>
  <Theme class="u-theme-dark overflow-hidden">
    <Preloader />
    <WebGLCanvas />
    <MainNav />
    <main>
      <NuxtPage :transition="pageTransition" />
    </main>
  </Theme>
  <GridGuide />
  <FpsMeter v-if="dev" />
</template>
