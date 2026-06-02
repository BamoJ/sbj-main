<script setup>
// First call initializes the singleton; lives in app.vue so it survives
// route changes — one Lenis instance for the entire site.
useLenis()
</script>

<template>
  <Theme class="u-theme-dark">
    <WebGLCanvas />
    <MainNav />
    <main>
      <NuxtPage />
    </main>
  </Theme>
  <GridGuide />
</template>
