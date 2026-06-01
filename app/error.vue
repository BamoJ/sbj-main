<script setup>
// Catches 404s (unmatched routes) and runtime errors. Renders standalone —
// NOT a child of app.vue — so MainNav / GridGuide / Theme are NOT inherited
// and must be re-included here if desired. Per starter design: bare, no nav,
// no grid overlay; just typography + a clear way out.

const props = defineProps({
  error: { type: Object, required: true },
})

const isNotFound = computed(() => props.error?.statusCode === 404)

useSeoMeta({
  title: isNotFound.value ? 'Not found' : 'Something went wrong',
  robots: 'noindex',
})

useAnims()
</script>

<template>
  <Theme class="u-theme-dark">
    <main class="min-h-screen w-full flex items-center justify-center">
      <div class="flex w-full flex-col h-full items-center gap-12">
        <h1 data-anim="heading" class="text-display font-medium">
          {{ isNotFound ? '404' : error?.statusCode || 'Error' }}
        </h1>
        <p data-anim="paragraph" class="text-medium opacity-50">
          {{
            isNotFound
              ? 'This page doesn’t exist — or it moved without telling us.'
              : 'Something broke on our end.'
          }}
        </p>
        <div data-anim="fade-in">
          <TextLink to="/">← Back to home</TextLink>
        </div>
      </div>
    </main>
  </Theme>
</template>
