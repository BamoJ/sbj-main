<script setup>
// Renders a Page.sections[] array. Maps each section's `_type` to a
// Vue component. To add a new section type:
//  1. Write the schema in studio/schemas/sections/
//  2. Register it in studio/schemas/index.ts + page.sections.of[]
//  3. Build the Vue component
//  4. Add the entry below

defineProps({
  sections: { type: Array, default: () => [] },
})

const SECTION_MAP = {
  hero: resolveComponent('SectionHero'),
  marquee: resolveComponent('SectionMarquee'),
  richText: resolveComponent('SectionRichText'),
}
</script>

<template>
  <template v-for="section in sections" :key="section._key">
    <component
      v-if="SECTION_MAP[section._type]"
      :is="SECTION_MAP[section._type]"
      v-bind="section"
    />
    <div v-else class="border border-red-500 p-4 text-small">
      Unknown section type: <code>{{ section._type }}</code>
    </div>
  </template>
</template>
