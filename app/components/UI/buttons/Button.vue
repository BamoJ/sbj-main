<script setup>
defineProps({
  variant: { type: String, default: 'primary' }, // 'primary' | 'secondary'
  to: { type: [String, Object], default: null }, // → <NuxtLink>
  href: { type: String, default: null }, // → <a target="_blank">
  type: { type: String, default: 'button' }, // for <button>: 'button' | 'submit' | 'reset'
  disabled: { type: Boolean, default: false },
})
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :class="['btn', disabled && 'pointer-events-none opacity-50']"
    :data-variant="variant"
    :aria-disabled="disabled || undefined"
  >
    <span class="btn__bg-wrap">
      <span class="btn__bg" />
      <span class="btn__bg-hover" />
    </span>
    <span class="btn__inner">
      <span class="btn__text-outer">
        <span class="btn__text"><slot /></span>
        <span class="btn__text-clone" aria-hidden="true"><slot /></span>
      </span>
    </span>
  </NuxtLink>

  <a
    v-else-if="href"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    :class="['btn', disabled && 'pointer-events-none opacity-50']"
    :data-variant="variant"
    :aria-disabled="disabled || undefined"
  >
    <span class="btn__bg-wrap">
      <span class="btn__bg" />
      <span class="btn__bg-hover" />
    </span>
    <span class="btn__inner">
      <span class="btn__text-outer">
        <span class="btn__text"><slot /></span>
        <span class="btn__text-clone" aria-hidden="true"><slot /></span>
      </span>
    </span>
  </a>

  <button
    v-else
    :type="type"
    :disabled="disabled"
    :class="['btn', disabled && 'pointer-events-none opacity-50']"
    :data-variant="variant"
  >
    <span class="btn__bg-wrap">
      <span class="btn__bg" />
      <span class="btn__bg-hover" />
    </span>
    <span class="btn__inner">
      <span class="btn__text-outer">
        <span class="btn__text"><slot /></span>
        <span class="btn__text-clone" aria-hidden="true"><slot /></span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.btn {
  /* Component-local geometry + easings only. Colors are written directly
     onto the .btn__* children below using the semantic theme tokens
     (--color-primary / --color-on-primary / --color-fg / --color-bg /
     --color-line), so .u-theme-* flips everything automatically. */
  --btn-padding: 0.75em 1em;
  --btn-radius: 2.5em;
  --btn-focus-inset: -0.125em;
  --btn-hover-scale: 1.065 1.095;
  --btn-click-scale: 0.955, 0.925;
  --btn-ease-click: cubic-bezier(0.4, 0, 0.2, 1);
  --btn-ease-hover: cubic-bezier(0.34, 1.44, 0.64, 1);
  --btn-ease-power-out: cubic-bezier(0.23, 1, 0.32, 1);
  --btn-ease-focus: cubic-bezier(0.32, 0.72, 0, 1);

  user-select: none;
  -webkit-user-select: none;
  background-color: transparent;
  outline: none;
  padding: 0;
  line-height: 1;
  text-decoration: none;
  display: inline-grid;
  position: relative;
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
}

.btn::after {
  content: '';
  display: block;
  position: absolute;
  inset: var(--btn-focus-inset);
  border-radius: var(--btn-radius);
  transition:
    box-shadow 0.3s var(--btn-ease-focus),
    scale 0.4s var(--btn-ease-hover);
  pointer-events: none;
  z-index: 1;
}

.btn:focus-visible::after {
  box-shadow: 0 0 0 0.125em var(--color-fg);
  scale: var(--btn-hover-scale);
  transition:
    box-shadow 0.3s var(--btn-ease-focus),
    scale 0.425s 0.05s var(--btn-ease-hover);
}

.btn__bg-wrap {
  pointer-events: none;
  border-radius: var(--btn-radius);
  grid-area: 1 / 1;
  width: 100%;
  height: 100%;
  display: grid;
  overflow: clip;
  /* Primary has no visible outline; secondary gets a 1px line via the
     descendant override below. The hover fill paints over either cleanly. */
  box-shadow: inset 0 0 0 1px transparent;
  transition:
    scale 0.4s var(--btn-ease-hover),
    transform 0.15s var(--btn-ease-click);
}

.btn[data-variant='secondary'] .btn__bg-wrap {
  box-shadow: inset 0 0 0 1px var(--color-line);
}

.btn:active .btn__bg-wrap {
  transform: scale(var(--btn-click-scale));
}

.btn__bg {
  background-color: var(--color-primary);
  border-radius: var(--btn-radius);
  grid-area: 1 / 1;
  place-self: center;
  /* 1px shy of the wrapper so AA edges don't bleed past the overflow-clip. */
  width: calc(100% - 1px);
  height: calc(100% - 1px);
  padding: 0;
}

.btn[data-variant='secondary'] .btn__bg {
  background-color: transparent;
}

.btn__bg-hover {
  z-index: 1;
  background-color: var(--color-fg);
  grid-area: 1 / 1;
  width: 100%;
  height: 100%;
  padding: 0;
  translate: 0 101% 0;
  transition: translate 0.45s var(--btn-ease-power-out);
}

.btn__inner {
  pointer-events: none;
  width: 100%;
  height: 100%;
  padding: var(--btn-padding);
  z-index: 1;
  grid-area: 1 / 1;
  justify-content: center;
  align-items: center;
  display: flex;
}

.btn__text-outer {
  /* Stacks the rest + clone labels in the same cell, clips the slide. */
  display: inline-grid;
  overflow: hidden;
  line-height: 1;
}

.btn__text,
.btn__text-clone {
  grid-area: 1 / 1;
  transition: translate 0.45s var(--btn-ease-power-out);
}

.btn__text {
  color: var(--color-on-primary);
}

.btn[data-variant='secondary'] .btn__text {
  color: var(--color-fg);
}

.btn__text-clone {
  color: var(--color-bg);
  translate: 0 100% 0;
}

@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .btn:hover .btn__bg-wrap,
  .btn:focus-visible .btn__bg-wrap {
    scale: var(--btn-hover-scale);
    transition:
      scale 0.425s 0.05s var(--btn-ease-hover),
      transform 0.15s var(--btn-ease-click);
  }

  .btn:hover .btn__bg-hover,
  .btn:focus-visible .btn__bg-hover {
    translate: 0 0 0;
    transition-delay: 0.05s;
  }

  /* Label rides up with the fill — original slides off the top, clone
     slides in from below. Both share the bg-hover delay so motion is
     locked together. */
  .btn:hover .btn__text,
  .btn:focus-visible .btn__text {
    translate: 0 -100% 0;
    transition-delay: 0.05s;
  }

  .btn:hover .btn__text-clone,
  .btn:focus-visible .btn__text-clone {
    translate: 0 0 0;
    transition-delay: 0.05s;
  }
}
</style>
