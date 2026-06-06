<script setup>
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import Container from '~/components/Wrapper/Container.vue'
import { prefersReducedMotion } from '~/utils/media'
import { easings } from '~/utils/easings'

gsap.registerPlugin(SplitText)

// Route name = registry key in layers/webgl/canvas/registry.js. The WebGL
// stage swaps to the Home view when this route is entered.
definePageMeta({ name: 'home' })

// Show the static home background whenever the WebGL particles aren't active —
// touch / reduced-motion (never active) or viewport below the breakpoint.
// Reactive, so it swaps live on resize.
const webgl = useWebGL()
const showLogoFallback = computed(() => !webgl?.activeRef?.value)

// One-page homepage / work index for the bamoj.com placeholder.
useSanitySeo('home', {
  title: 'Studio•Bamo.J®',
  description:
    'The portfolio of Bamo.J® — a creative studio working at the intersection of design, motion, and code.',
  ogType: 'website',
})

// Site settings singleton — social links for the footer cell.
const { data: settings } =
  await useSanityQuery(groq`*[_type == "settings"][0]{
  socials[]{ label, url }
}`)

// Work index — all projects in Studio order (drag-to-reorder via orderRank).
const { data: projects } =
  await useSanityQuery(groq`*[_type == "project"] | order(orderRank){
  _id, title, role, year, url
}`)

// Menu panel open state — shared with the MainNav button via the same
// useState key (Nuxt's built-in cross-component reactive state).
const isOpen = useState('menu:open', () => false)

// Menu reveal — one paused master timeline that play()s on open and
// reverse()s on close. We don't reuse useAnims()/[data-anim] here: that
// system fires once on mount and never reverses (wrong for a toggleable
// panel). We borrow ParaReveal's SplitText conventions but drive playback
// off the shared isOpen ref.
const panel = ref(null)
let menuTl = null
let splits = []

onMounted(async () => {
  // Reduced-motion: skip the timeline entirely. The [data-open] CSS rule
  // then drives an instant (no-transition) open/close, so the menu still
  // works — just without the animated reveal.
  if (prefersReducedMotion()) return

  // SplitText measures rendered glyphs — split before fonts load and lines
  // mis-wrap (same reason useAnims awaits this).
  await document.fonts.ready
  if (!panel.value) return

  const lineEls = panel.value.querySelectorAll('[data-menu-line]')
  const menuDivLine = panel.value.querySelectorAll(
    '[data-menu-div-line]',
  )
  const menuFadeEls = panel.value.querySelectorAll('[data-menu-fade]')
  const lines = []
  lineEls.forEach((el) => {
    const split = new SplitText(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'line',
      smartWrap: true,
      reduceWhiteSpace: false,
    })
    splits.push(split)
    lines.push(...split.lines)
  })

  // The big intro paragraph leads; everything else cascades after it.
  const heading = splits[0]?.lines ?? []
  const rest = lines.slice(heading.length)

  menuTl = gsap.timeline({
    paused: true,
  })
  menuTl
    .set(lines, { yPercent: 100 }, 0)
    .fromTo(
      panel.value,
      { clipPath: 'inset(0% 0% 0% 100%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 1.25,
        ease: easings.transitionEase,
      },
      0,
    )
    .to(
      heading,
      {
        yPercent: 0,
        duration: 1,
        stagger: 0.05,
        ease: easings.paragraphEase,
      },
      '<+0.65',
    )
    .from(
      menuDivLine,
      {
        scaleX: 0,
        duration: 1.2,
        stagger: 0.05,
        ease: easings.transitionEase,
      },
      '<+0.25',
    )
    .from(
      menuFadeEls,
      {
        opacity: 0,
        duration: 1,
        stagger: {
          amount: 0.2,
        },
        ease: 'sine.inOut',
      },
      '< ',
    )
    .to(
      rest,
      {
        yPercent: 0,
        duration: 0.8,
        stagger: 0.025,
        ease: easings.paragraphEase,
      },
      '<+0.2',
    )

  // If the menu was already open before the timeline finished building
  // (fonts still loading), jump it to the open state.
  if (isOpen.value) menuTl.progress(1)
})

watch(isOpen, (open) => {
  if (!menuTl) return
  menuTl.timeScale(open ? 1 : 3)
  open ? menuTl.play() : menuTl.reverse()
})

onUnmounted(() => {
  splits.forEach((s) => s.revert())
  splits = []
  menuTl?.kill()
})

// [data-anim] reveals (the hero <h1> is animated by the page transition).
useAnims()
</script>

<template>
  <div>
    <div
      data-menu
      class="absolute inset-0 w-full h-full z-[1000] flex flex-row justify-end pointer-events-none"
    >
      <div
        id="site-menu"
        ref="panel"
        data-menu-panel
        :data-open="isOpen"
        :class="
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        "
        class="relative w-1/2 h-full bg-black pt-2 transform-gpu max-md:w-full"
      >
        <div
          class="absolute top-0 left-0 w-full h-full pointer-events-none"
        >
          <NuxtImg
            src="/images/menu-bg.png"
            alt=""
            aria-hidden="true"
            class="w-full h-full object-cover opacity-50"
          />
        </div>
        <Container class="h-full">
          <div class="w-full h-full flex flex-col px-[1em]">
            <div
              class="w-full flex flex-row justify-between relative pb-[1em]"
            >
              <span data-menu-fade class="w-[3rem]">
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 66 31"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8.789 30.6412C7.55926 30.6412 6.54654 30.4766 5.75082 30.1474C4.95511 29.8183 4.17146 29.3833 3.39986 28.8426C2.77293 28.3959 2.3148 28.1726 2.02545 28.1726C1.7361 28.1726 1.53114 28.3019 1.41058 28.5605C1.29002 28.7956 1.2659 29.3481 1.33824 30.218H0.940386L0 22.0011H0.470193C0.614868 22.918 0.940387 23.9877 1.44675 25.2103C1.97722 26.4328 2.84527 27.5613 4.0509 28.5958C5.25652 29.6302 6.82383 30.1474 8.75283 30.1474C10.0308 30.1474 11.1159 29.9006 12.008 29.4069C12.9002 28.8896 13.5633 28.2196 13.9973 27.3967C14.4554 26.5739 14.6845 25.6805 14.6845 24.7165C14.6845 23.4705 14.2384 22.295 13.3463 21.19C12.4782 20.0615 10.935 19.0035 8.71666 18.0161C6.76355 17.1462 5.22035 16.3351 4.08706 15.5828C2.97789 14.8069 2.17012 14.0193 1.66376 13.22C1.18151 12.3971 0.940386 11.4684 0.940386 10.434C0.940386 9.58762 1.16945 8.75298 1.62759 7.93012C2.08573 7.10726 2.77293 6.43721 3.68921 5.91998C4.62959 5.40275 5.76288 5.14414 7.08907 5.14414C7.86067 5.14414 8.54787 5.26169 9.15068 5.4968C9.7535 5.7319 10.4166 6.06104 11.14 6.48423C11.791 6.8604 12.213 7.04848 12.4059 7.04848C12.5988 7.04848 12.7314 6.93093 12.8037 6.69583C12.9002 6.46072 12.9484 6.0728 12.9484 5.53206H13.3101L14.0696 12.6557H13.6356C13.515 11.6448 13.1413 10.5868 12.5144 9.48182C11.8874 8.35332 11.0797 7.41289 10.0911 6.66056C9.12657 5.90823 8.08974 5.53206 6.98056 5.53206C5.43736 5.53206 4.20763 5.97876 3.29135 6.87215C2.39919 7.76555 1.95311 8.85879 1.95311 10.1519C1.95311 11.4684 2.5077 12.6322 3.61687 13.6432C4.72605 14.6306 6.51037 15.6533 8.96984 16.7113C11.2846 17.6987 13.0087 18.8154 14.142 20.0615C15.2994 21.3075 15.8781 22.7182 15.8781 24.2934C15.8781 25.5864 15.5405 26.7149 14.8653 27.6789C14.2143 28.6428 13.3463 29.3834 12.2612 29.9006C11.1761 30.3943 10.0187 30.6412 8.789 30.6412Z"
                    fill="white"
                  />
                  <path
                    d="M18.3136 21.5075C17.7349 21.5075 17.2406 21.3194 16.8307 20.9433C16.4449 20.5436 16.252 20.0616 16.252 19.4974C16.252 18.9566 16.4449 18.4864 16.8307 18.0867C17.2406 17.6871 17.7349 17.4872 18.3136 17.4872C18.8682 17.4872 19.3504 17.6871 19.7603 18.0867C20.1702 18.4864 20.3752 18.9566 20.3752 19.4974C20.3752 20.0616 20.1702 20.5436 19.7603 20.9433C19.3504 21.3194 18.8682 21.5075 18.3136 21.5075Z"
                    fill="white"
                  />
                  <path
                    d="M28.4852 4.02028C27.9065 4.02028 27.4122 3.83219 27.0023 3.45603C26.6165 3.05635 26.4236 2.57439 26.4236 2.01014C26.4236 1.4694 26.6165 0.999191 27.0023 0.599514C27.4122 0.199838 27.9065 0 28.4852 0C29.0398 0 29.522 0.199838 29.9319 0.599514C30.3419 0.999191 30.5468 1.4694 30.5468 2.01014C30.5468 2.57439 30.3419 3.05635 29.9319 3.45603C29.522 3.83219 29.0398 4.02028 28.4852 4.02028Z"
                    fill="white"
                  />
                  <path
                    d="M34.2381 4.02028C33.6594 4.02028 33.1651 3.83219 32.7552 3.45603C32.3694 3.05635 32.1765 2.57439 32.1765 2.01014C32.1765 1.4694 32.3694 0.999191 32.7552 0.599514C33.1651 0.199838 33.6594 0 34.2381 0C34.7927 0 35.275 0.199838 35.6849 0.599514C36.0948 0.999191 36.2997 1.4694 36.2997 2.01014C36.2997 2.57439 36.0948 3.05635 35.6849 3.45603C35.275 3.83219 34.7927 4.02028 34.2381 4.02028Z"
                    fill="white"
                  />
                  <path
                    d="M21.7048 30.5415L21.7048 5.32666L33.2788 5.32666C36.0517 5.32666 38.1375 5.93793 39.536 7.16047C40.9104 8.3595 41.5976 9.9347 41.5976 11.8861C41.5976 14.3546 40.2473 16.0356 37.5467 16.929V17.0348C38.9935 17.458 40.1508 18.2221 41.0189 19.3271C41.9111 20.4321 42.3571 21.7487 42.3571 23.2768C42.3571 25.5103 41.5976 27.2619 40.0785 28.5314C38.5112 29.8715 36.3411 30.5415 33.5681 30.5415L21.7048 30.5415ZM26.9493 19.2566V26.3097H32.9894C34.2433 26.3097 35.2319 26.004 35.9553 25.3928C36.6787 24.758 37.0403 23.9234 37.0403 22.8889C37.0403 21.7369 36.6425 20.8435 35.8468 20.2087C35.0752 19.574 34.0745 19.2566 32.8448 19.2566H26.9493ZM26.9493 15.4831L32.6278 15.4831C33.7852 15.4831 34.7135 15.2245 35.4127 14.7073C36.112 14.1666 36.4616 13.4142 36.4616 12.4503C36.4616 11.5099 36.1241 10.7811 35.4489 10.2638C34.7979 9.74662 33.8937 9.488 32.7363 9.488L26.9493 9.488L26.9493 15.4831Z"
                    fill="white"
                  />
                  <path
                    d="M51.4445 31C48.7198 31 46.622 30.3887 45.1512 29.1662C43.7044 27.9201 42.981 26.0863 42.981 23.6648L42.981 21.1609H47.683L47.683 23.3474C47.683 25.6984 48.7922 26.8739 51.0105 26.8739C53.0842 26.8739 54.121 25.7219 54.121 23.4179L54.121 5.32666L59.3655 5.32666L59.3655 23.4532C59.3655 25.7102 58.6903 27.5322 57.34 28.9193C55.9897 30.3064 54.0246 31 51.4445 31Z"
                    fill="white"
                  />
                  <path
                    d="M65.1653 9.8234C64.6088 10.366 63.9233 10.6373 63.1088 10.6373C62.2942 10.6373 61.6087 10.366 61.0523 9.8234C60.4958 9.28082 60.2176 8.60064 60.2176 7.78285C60.2176 6.96506 60.4958 6.28488 61.0523 5.7423C61.6087 5.19973 62.2942 4.92844 63.1088 4.92844C63.9233 4.92844 64.6088 5.19973 65.1653 5.7423C65.7218 6.28488 66 6.96506 66 7.78285C66 8.60064 65.7218 9.28082 65.1653 9.8234ZM63.1088 10.2008C63.7943 10.2008 64.3588 9.9728 64.8024 9.51672C65.2459 9.06065 65.4677 8.48269 65.4677 7.78285C65.4677 7.09087 65.2459 6.51685 64.8024 6.06077C64.3588 5.60469 63.7943 5.37666 63.1088 5.37666C62.4313 5.37666 61.8668 5.60469 61.4152 6.06077C60.9716 6.51685 60.7498 7.09087 60.7498 7.78285C60.7498 8.47483 60.9716 9.05278 61.4152 9.51672C61.8668 9.9728 62.4313 10.2008 63.1088 10.2008ZM61.8749 9.26903V6.24949H63.3749C63.6894 6.24949 63.9516 6.32812 64.1612 6.48539C64.379 6.64266 64.4879 6.8589 64.4879 7.13412C64.4879 7.49584 64.3104 7.73567 63.9556 7.85362V7.87721C64.1975 7.94798 64.3508 8.12884 64.4153 8.41978C64.4314 8.51414 64.4435 8.63209 64.4516 8.77363C64.4596 8.90731 64.4717 9.00954 64.4879 9.08031C64.504 9.15108 64.5282 9.19433 64.5604 9.21005V9.26903H63.7378C63.7056 9.2533 63.6612 9.02133 63.6048 8.57312C63.5806 8.30576 63.4193 8.17209 63.1209 8.17209H62.7096V9.26903H61.8749ZM62.7096 6.89822V7.58233H63.2298C63.5201 7.58233 63.6653 7.46831 63.6653 7.24028C63.6653 7.01224 63.5201 6.89822 63.2298 6.89822H62.7096Z"
                    fill="white"
                  />
                </svg>
              </span>
              <button
                data-menu-fade
                class="px-2 py-2 cursor-pointer"
                @click="isOpen = false"
              >
                close
              </button>
              <div class="absolute bottom-0 w-full h-[3px]">
                <div
                  data-menu-div-line
                  class="w-full h-full bg-white"
                ></div>
              </div>
            </div>

            <div
              class="flex flex-col h-full justify-between pt-[2em]"
            >
              <span data-menu-line class="text-large leading-[1.1]">
                Studio•Bämo.J® is an independent creative studio with
                a primary focus on web experiences, digital design,
                motion–interaction and development delivering bespoke
                — digital craftsmanship.
              </span>
              <div class="flex flex-col w-full">
                <div
                  class="grid w-full grid-cols-6 w-full pt-[2em] pb-[2em] gap-gutte relative"
                >
                  <div class="absolute top-0 w-full h-[1px]">
                    <div
                      data-menu-div-line
                      class="w-full h-full bg-white opacity-50"
                    ></div>
                  </div>
                  <div
                    data-menu-fade
                    class="rounded-round bg-amber-50 w-2 h-2 col-start-1"
                  ></div>
                  <div class="col-start-3 flex flex-col gap-1">
                    <span data-menu-line>Services</span>
                    <ul
                      data-menu-line
                      class="mt-2 flex flex-col text-small"
                    >
                      <li>Web Design</li>
                      <li>Web Development</li>
                      <li>Design Direction</li>
                      <li>Art Direction</li>
                    </ul>
                  </div>
                  <div
                    class="col-start-5 col-span-2 flex flex-col gap-1"
                  >
                    <span data-menu-line>Accolades</span>
                    <ul
                      data-menu-line
                      class="mt-2 flex flex-col text-small"
                    >
                      <li>Awwwards</li>
                      <li>CSSDA</li>
                      <li>Communication Arts</li>
                      <li>Codrops</li>
                      <li>Muzli</li>
                      <li>Design Rush</li>
                    </ul>
                  </div>
                </div>
                <div
                  class="grid w-full grid-cols-6 w-full pt-[2em] pb-[2em] gap-gutte relative"
                >
                  <div class="absolute top-0 w-full h-[1px]">
                    <div
                      data-menu-div-line
                      class="w-full h-full bg-white opacity-50"
                    ></div>
                  </div>
                  <div
                    data-menu-fade
                    class="rounded-round bg-amber-50 w-2 h-2 col-start-1"
                  ></div>
                  <div class="col-start-3 flex flex-col gap-1">
                    <span data-menu-line>Social</span>
                    <ul
                      data-menu-line
                      class="mt-2 flex flex-col text-small"
                    >
                      <li
                        v-for="social in settings?.socials"
                        :key="social.url"
                      >
                        <TextLink :href="social.url">
                          {{ social.label }}
                        </TextLink>
                      </li>
                    </ul>
                  </div>
                  <div class="col-start-5 col-span-2">
                    <div
                      data-menu-line
                      class="flex flex-col gap-1 items-start"
                    >
                      <span>Project Inquiries</span>
                      <TextLink
                        class="text-small"
                        href="https://cal.com/bamoj/discovery-session"
                      >
                        Booking
                      </TextLink>
                    </div>
                    <div
                      data-menu-line
                      class="flex flex-col gap-1 mt-5 items-start"
                    >
                      <span>Project Inquiries</span>
                      <TextLink
                        class="text-small"
                        href="mailto:hi@bamoj.com"
                      >
                        hi@bamoj.com
                      </TextLink>
                    </div>
                  </div>
                </div>
                <div
                  class="flex w-full flex-row justify-between relative pt-[2em] pb-[1em]"
                >
                  <div class="absolute top-0 w-full h-[1px]">
                    <div
                      data-menu-div-line
                      class="w-full h-full bg-white opacity-50"
                    ></div>
                  </div>
                  <span data-menu-line class="text-small">
                    6.2615° S, 106.8106° E
                  </span>
                  <span data-menu-line class="text-small">
                    Full Website Soon
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </div>
    <section class="relative">
      <NuxtImg
        v-if="showLogoFallback"
        src="/images/texture.png"
        alt=""
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      <Container class="flex h-screen min-h-screen flex-col">
        <div class="w-full flex-1 grid grid-cols-12 gap-gutter">
          <div
            class="relative w-full h-full col-start-8 col-end-[13] max-md:col-start-1 max-md:col-end-[13]"
          >
            <div
              class="w-full h-full flex flex-col pt-[10vh] max-md:pt-[15vh]"
            >
              <div
                class="w-full flex flex-row items-center justify-between pb-[1em] relative"
              >
                <div class="overflow-hidden">
                  <span data-load-mid class="inline-block text-main">
                    Selected Work
                  </span>
                </div>
                <div class="overflow-hidden">
                  <span data-load-mid class="inline-block text-main">
                    [10]
                  </span>
                </div>
                <div class="absolute bottom-0 w-full h-[5px]">
                  <div
                    data-load-line
                    class="w-full h-full bg-current"
                  ></div>
                </div>
              </div>
              <div class="w-full h-full flex flex-row">
                <div class="w-full flex flex-col">
                  <component
                    :is="project.url ? 'a' : 'div'"
                    v-for="(project, i) in projects"
                    :key="project._id"
                    :href="project.url || undefined"
                    :target="project.url ? '_blank' : undefined"
                    :rel="
                      project.url ? 'noopener noreferrer' : undefined
                    "
                    class="work-row grid grid-cols-5 w-full items-center gap-gutter pb-[1em] pt-[1em] max-md:pb-2 max-md:pt-2 max-md:grid-cols-6"
                  >
                    <!-- 3D hover block: hinged at the row's bottom edge, rests
                         edge-on (invisible) and flips flat to face the viewer
                         on hover. See .work-row rules in <style scoped>. -->
                    <div
                      aria-hidden="true"
                      class="work-row__fill"
                    ></div>
                    <div
                      class="project col-span-3 flex flex-row gap-[2.75em] items-start max-md:gap-[1em] max-md:col-span-3"
                    >
                      <div class="overflow-hidden">
                        <span
                          data-load-mid
                          class="inline-block text-small mt-[0.1em]"
                        >
                          {{ i + 1 }}
                        </span>
                      </div>
                      <div class="overflow-hidden">
                        <span
                          data-load-mid
                          class="inline-block text-medium"
                        >
                          {{ project.title }}
                        </span>
                      </div>
                    </div>

                    <div class="overflow-hidden col-span-1">
                      <span
                        data-load-mid
                        class="inline-block text-main"
                      >
                        {{ project.role }}
                      </span>
                    </div>
                    <div
                      class="overflow-hidden col-span-1 max-md:col-start-6"
                    >
                      <span
                        data-load-mid
                        class="inline-block text-main"
                      >
                        {{ project.year }}
                      </span>
                    </div>
                    <div
                      class="absolute bottom-0 w-full h-[1px] col-span-5"
                    >
                      <div
                        data-load-line
                        class="w-full h-full bg-white opacity-20"
                      ></div>
                    </div>
                  </component>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          class="bottom w-full grid grid-cols-12 gap-gutter absolute bottom-0 left-0 pb-4 max-md:text-small"
        >
          <div class="overflow-hidden col-start-1 max-md:hidden">
            <span data-load-mid class="inline-block">©2K26</span>
          </div>
          <div class="col-start-5 flex flex-row gap-1 max-md:hidden">
            <div class="overflow-hidden">
              <span data-load-mid class="inline-block">Jkt</span>
            </div>
            <div class="overflow-hidden">
              <span data-load-mid class="inline-block">/</span>
            </div>
            <div class="overflow-hidden">
              <span data-load-mid class="inline-block">Bali</span>
            </div>
          </div>
          <div
            class="col-start-8 flex flex-row gap-12 max-md:col-start-1 max-md:col-end-[5] gap-gutter"
          >
            <div
              v-for="social in settings?.socials"
              :key="social.url"
              class="overflow-hidden shrink-0"
            >
              <TextLink
                data-load-mid
                class="inline-block"
                :href="social.url"
              >
                {{ social.label }}
              </TextLink>
            </div>
          </div>
          <div
            class="col-start-12 max-md:col-satrt-5 max-md:col-end-[13] flex flex-row justify-end gap-1"
          >
            <div class="overflow-hidden shrink-0">
              <TextLink
                data-load-mid
                class="inline-block"
                href="https://cal.com/bamoj/discovery-session"
              >
                Booking
              </TextLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  </div>
</template>

<style scoped>
/* SplitText inserts `.line-mask` at runtime — :deep() pierces scope.
   Covers both the hero <h1> and the menu panel's reveal lines so the
   last glyph isn't clipped during the yPercent reveal. */
:deep(.line-mask) {
  padding-right: 0.1em;
}

/* clip-path is GSAP-driven (the master timeline in <script setup> writes an
   inline clip-path that overrides these rules whenever the timeline exists).
   These rules are the no-JS / reduced-motion fallback: closed by default,
   open instantly via [data-open] — no transition, since the timeline is
   skipped under reduced-motion. */
[data-menu-panel] {
  clip-path: inset(0% 0% 0% 100%);
}

[data-menu-panel][data-open='true'] {
  clip-path: inset(0% 0% 0% 0%);
}

[data-load-line] {
  transform-origin: left center;
}

[data-menu-div-line] {
  transform-origin: left center;
}

/* Work-row hover: a white block slides up from the bottom to fill the row.
   The fill sits at z-index:-1 (behind the text, above the transparent row bg —
   overflow:hidden clips it while it's parked below). The text uses
   mix-blend-mode:difference, so white text reads black wherever the white fill
   is behind it and stays white elsewhere — inverting/reverting automatically
   as the fill slides, no color toggle. isolation:isolate confines the blend to
   the row (it won't blend against the page bg behind it). */
.work-row {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  color: #fff;
}

.work-row span {
  mix-blend-mode: difference;
}

.work-row__fill {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: #fff;
  transform: translateY(105%);
  pointer-events: none;
  transition: transform 0.5s var(--gleasing);
}

.work-row:hover .work-row__fill {
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .work-row,
  .work-row__fill {
    transition: none;
  }
  .work-row__fill {
    display: none;
  }
}
</style>
