<script setup>
useSanitySeo('contact', {
  title: 'Contact',
  description:
    'Get in touch with Studio•Bamo.J® — for project inquiries, collaborations, and the occasional good conversation.',
  ogType: 'website',
})

useAnims()
</script>

<template>
  <div>
    <section class="w-full">
      <Container class="h-screen">
        <div class="flex min-h-full w-full flex-col justify-end py-12 gap-10">
          <NuxtImg
            src="/images/image_197.webp"
            alt="Contact hero image"
            class="pointer-events-none absolute inset-0 h-full w-full object-cover object-top"
          />
          <div class="relative flex flex-row items-start justify-between">
            <h1 data-hero-title class="text-display max-w-[12ch]">
              Roll or die, you bet
              <br />
              I'm a rider
            </h1>
            <PageNumber>4</PageNumber>
          </div>
        </div>
      </Container>
    </section>

    <section class="w-full">
      <Container class="py-margin">
        <div class="min-w-full flex flex-col items-center justify-center">
          <Form class="min-w-[40vw]" />
        </div>
      </Container>
    </section>
  </div>
</template>
