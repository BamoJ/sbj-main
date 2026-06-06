# Preloader — first-load tracker + fast-boot contract

The bamoj.com first-load overlay ([app/components/Global/Preloader.vue](app/components/Global/Preloader.vue))
and the boot-path decisions that make the site actually load fast (not masked).

## Goal
The loader **listens to everything that loads on first visit** — every script/css/font/image/
fetch + the WebGL particle logo + the CMS data — and its number is **driven by real load
progress** (normalized), revealing only when the site is genuinely ready.

## How the tracker works (`trackEverything` in Preloader.vue)
Three signal sources feed one monotonic, normalized `progress` (0→1):

1. **Byte-weighted resource backbone** — `PerformanceObserver({ type:'resource', buffered:true })`
   sums `transferSize` (fallback `encodedBodySize`) of every completed resource, **past
   (buffered) and future**. Mapped through a saturating curve `1 - exp(-bytes/SCALE)` (SCALE ≈
   600 KB expected first-load) so the number climbs with real bytes — faster on fast connections,
   slower on slow ones.
2. **Weighted milestones** (work bytes can't represent): `document.fonts.ready`; `webgl` =
   `emitter.once('webgl:ready')` (fired by [WebGLCanvas.vue](layers/webgl/components/WebGLCanvas.vue)
   after the logo PNG rasterizes + first GPU frame); `cms` = `useState('cms:ready')`, set by
   [index.vue](app/pages/index.vue) when both lazy Sanity queries settle (success **or** error).
3. **Blend + finish:** `target = min(0.99, 0.5·milestones + 0.5·resourceBytes)`, monotonic. Snaps
   to 100 only when **all milestones done AND the network has been idle ~500ms** (catches the
   late/lazy tail). An **8s hard timeout** is the failsafe — the overlay can never be trapped.

Milestones pre-satisfy when they don't apply: `webgl` when WebGL is off (touch/reduced-motion) or
won't activate this load (`!activeRef.value`, i.e. <768px), so we never wait on a `webgl:ready`
that won't fire.

## Two honest limits (NOT solvable — don't try to "fix" by masking)
- **L1 — the loader can't tick during its own load.** The entry JS + render-blocking CSS load
  before the Vue overlay can render. We retroactively *count* them (buffered resource timing) so the
  final number is honest, but the bar visibly **starts at JS-ready**. Showing anything earlier
  requires baking markup into the HTML document (a static splash) = masking — rejected here. The
  dark `#131313` body bg in [base.css](app/assets/css/base.css) covers that sub-moment instead.
- **L2 — total bytes are unknown upfront.** The browser exposes no full manifest, and resource-
  timing entries appear only on completion. So a perfectly linear real-time % is impossible; the
  number is a real-signal-driven **normalized estimate** that reaches 100 exactly at true finish.

## Fast-boot contract (why the loader appears fast in the first place)
These keep the boot path light + unblocked — the loader (and page) mount the instant JS boots:
- **No blocking network on boot.** The old `sanity-prefetch.client.js` (async plugin fetching the
  deleted `page` type) was **deleted**. Don't reintroduce a boot-time `await`ed fetch; lazy-load CMS.
- **Lazy CMS queries.** [index.vue](app/pages/index.vue) uses `useLazySanityQuery` (no `await`) so
  Nuxt's root Suspense doesn't hold the whole app (incl. the Preloader) out of the DOM. The loader
  then explicitly waits on the `cms:ready` milestone instead.
- **three.js is NOT in the entry bundle.** [webgl.client.js](layers/webgl/plugins/webgl.client.js)
  keeps the capability gate + `activeRef` synchronous but **dynamically imports** Canvas/three via
  `ensure()` (awaited in WebGLCanvas `syncActive` on first desktop activation). three lands in its
  own chunk; mobile/touch never download it. Keep `optimizeDeps.include` to `['gsap']` only — adding
  `three` back doesn't force it into the prod entry, but signals the wrong intent.

Verify after changes: `bun run build && node .output/server/index.mjs`, `curl /` → the entry chunk
in the HTML must NOT contain `WebGLRenderer`; throttle Network Fast vs Slow 4G → the loader number
must visibly track real load (not jump in quarters); CMS-driven work-list is populated the instant
the overlay lifts.
