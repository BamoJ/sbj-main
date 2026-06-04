<script setup>
import { pageTransition } from '~/transitions/pageTransition'

// First call initializes the singleton; lives in app.vue so it survives
// route changes — one Lenis instance for the entire site.
useLenis()
</script>

<template>
  <Theme class="u-theme-dark overflow-hidden">
    <!-- Persistent WebGL stage. Mounts once; the GL context survives route
         changes. onMounted boots the renderer + enters the initial page. -->
    <WebGLCanvas />
    <MainNav />
    <main>
      <NuxtPage :transition="pageTransition" />
    </main>
  </Theme>
  <GridGuide />
</template>
