<script setup>
useSanitySeo('about', {
  title: 'About',
  description:
    'Studio•Bamo.J® is a solo creative studio. Founded by Bimo Tri (Bämo). Premium-only practice — design systems, motion, WebGL, and brand experience.',
  ogType: 'profile',
})

useAnims()
</script>

<template>
  <div>
    <section class="flex h-screen w-full flex-col justify-end py-12 relative">
      <NuxtImg
        src="/images/image-1.webp"
        alt="About hero image"
        class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50"
      />
      <Container>
        <div class="relative flex min-h-full w-full flex-col flex-row justify-between">
          <h1 data-hero-title class="text-display">
            Currently listening
            <br />
            to SleepToken
          </h1>
          <PageNumber>2</PageNumber>
        </div>
      </Container>
    </section>

    <section class="w-full">
      <Container class="h-screen">
        <div class="flex min-h-full w-full flex-row justify-start items-center gap-12">
          <h2 class="text-h2">Button Config</h2>
          <h2 class="text-h2">Button Config</h2>
        </div>
      </Container>
    </section>

    <!-- ── TEMP: Button system test block — delete after verifying ── -->
    <section class="w-full p-margin">
      <Container>
        <h3 class="text-h3 mb-6">Button test (light theme)</h3>
        <div class="u-theme-light flex flex-col items-start gap-4 p-6">
          <Button>Default (primary)</Button>
          <Button variant="primary">Save</Button>
          <Button variant="secondary">Cancel</Button>

          <TextLink>Read more →</TextLink>
          <Button to="/work">Internal NuxtLink</Button>
          <Button href="https://anthropic.com">External anchor</Button>
          <Button disabled>Disabled</Button>
        </div>

        <div class="u-theme-dark w-full mt-12 p-gutter">
          <h3 class="text-h4 mb-6">Button test (dark theme cascade)</h3>
          <div class="flex flex-col items-start gap-4 mt-4 p-6">
            <Button variant="primary">Save</Button>
            <Button variant="secondary">Cancel</Button>
            <TextLink>Read more →</TextLink>
            <Button to="/work">Internal NuxtLink</Button>
          </div>
        </div>

        <div class="u-theme-brand mt-12 p-gutter">
          <h3 class="text-h4 mb-6">Button test (brand theme cascade)</h3>
          <div class="flex flex-col items-start gap-4 mt-4 p-6">
            <Button variant="primary">Save</Button>
            <Button variant="secondary">Cancel</Button>
            <TextLink>Read more →</TextLink>
          </div>
        </div>
      </Container>
    </section>
  </div>
</template>
