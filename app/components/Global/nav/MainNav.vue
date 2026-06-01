<script setup>
const route = useRoute()

const navItems = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
  { name: 'Work', path: '/work' },
  { name: 'Contact', path: '/contact' },
  { name: 'CMSdemo', path: '/cms-demo' },
]
</script>

<template>
  <nav class="mix-blend-exclusion fixed top-0 left-0 z-1000 flex w-full">
    <Container>
      <div class="grid grid-cols-12 py-4 items-start">
        <div class="w-[7vw]">
          <NuxtLink to="/"><Logo /></NuxtLink>
        </div>
        <div class="col-start-12 -col-end-2 flex flex-col items-end">
          <NavItem
            v-for="item in navItems"
            :key="item.path"
            class="relative flex flex-row gap-2 items-center"
          >
            <div
              class="h-1 w-1 bg-white transition-[opacity,transform] duration-400 ease-out"
              :class="route.path === item.path ? 'opacity-100 scale-100' : 'opacity-0 scale-50'"
            ></div>
            <TextLink :to="item.path">
              {{ item.name }}
            </TextLink>
          </NavItem>
        </div>
      </div>
    </Container>
  </nav>
</template>
