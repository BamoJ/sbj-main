<script setup>
defineProps({
  to: { type: [String, Object], default: null }, // → <NuxtLink>
  href: { type: String, default: null }, // → <a target="_blank">
  disabled: { type: Boolean, default: false },
})

const baseClass =
  'relative inline-flex items-center gap-1 font-medium  ' + 'text-link-fg  cursor-pointer'
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :class="[baseClass, disabled && 'pointer-events-none opacity-50']"
    :aria-disabled="disabled || undefined"
    data-underline-link
  >
    <slot />
  </NuxtLink>

  <a
    v-else
    :href="href || undefined"
    :target="href ? '_blank' : undefined"
    :rel="href ? 'noopener noreferrer' : undefined"
    :class="[baseClass, disabled && 'pointer-events-none opacity-50']"
    :aria-disabled="disabled || undefined"
    data-underline-link
  >
    <slot />
  </a>
</template>

<style scoped>
/* Default underline animation — wipes in from the left on hover, wipes out
   to the right on leave (transform-origin flips). `background-color:
   currentColor` makes the line track the cascading link-fg token, so it
   themes automatically with .u-theme-*. */
[data-underline-link]::before {
  content: '';
  position: absolute;
  bottom: -0.0625em;
  left: 0;
  width: 100%;
  height: 0.0625em;
  background-color: currentColor;
  transition: transform 0.3s cubic-bezier(0.625, 0.05, 0, 1);
  transform-origin: right;
  transform: scaleX(0) rotate(0.001deg);
}

@media (hover: hover) and (pointer: fine) {
  /* [data-hover] parent trigger lets a wrapping element (e.g. a card)
     drive the underline on its own :hover. */
  [data-hover]:hover [data-underline-link]::before,
  [data-underline-link]:hover::before {
    transform-origin: left;
    transform: scaleX(1) rotate(0.001deg);
  }
}
</style>
