---
name: layout
description: Lay out pages/sections on the 12-column grid using the Container primitive. Use when building page layouts, positioning blocks on the grid, pinning bars/overlays (absolute/fixed), or debugging why columns don't align / content bleeds past the gutter.
user-invokable: true
---

# Layout — Container + 12-column grid for this starter

## Container is the single layout primitive

[app/components/Wrapper/Container.vue](app/components/Wrapper/Container.vue) sets its
edge inset with **margin, not padding**:

```html
<div class="relative mx-auto w-[calc(100%-var(--spacing-margin))]"> <slot/> </div>
```

This mirrors the canonical Webflow container (`width: calc(100% - margin)`, centered,
no inner padding). Wrap any page/section content in `<Container>` and put the grid
inside it.

### Why margin, not padding (the rule that matters)

`padding` only indents **in-flow** children. An **absolutely/fixed-positioned** child
anchors to its ancestor's **padding box** (CSS containing-block spec — see
[MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_display/Containing_block)),
so padding does NOT push it in — it spans across the gutter and **bleeds**.

Because Container insets with margin, its **padding box == content box**, so in-flow
children AND absolutely-positioned children align to the *same* edges. No per-child
`px-gutter`. A pinned bottom bar is just:

```html
<Container class="relative h-screen">
  <div class="hero grid grid-cols-12 gap-gutter"> … </div>
  <div class="absolute inset-x-0 bottom-0 grid grid-cols-12 gap-gutter"> … </div>
</Container>
```

Both grids line up automatically. (If you ever inset a container with `px-gutter`
padding instead, an absolute child needs the gutter restated on itself — avoid that;
use the margin-based Container.)

## The 12-column grid

`grid grid-cols-12 gap-gutter` **inside Container**. Canonical reference:
[GridGuide.vue](app/components/GridGuide.vue) — toggle the red column overlay with
**Shift+G** to eyeball alignment.

Position blocks with `col-start-N` / `col-end-N`. **Off-by-one gotcha:** 12 columns =
13 grid lines. To span *through* the last column use `col-end-13` — `col-end-12` stops
at the end of column 11.

## Tokens ([app/assets/css/tokens.css](app/assets/css/tokens.css))

| Token | Value | Use |
| --- | --- | --- |
| `--spacing-gutter` | `1rem` | column gap (`gap-gutter`) |
| `--spacing-margin` | fluid `clamp` ~30→60px | page edge inset (Container width) |
| `--max-width-main` | `120rem` (= `--site-viewport-max: 120`, clamp ceiling) | cap variant — add `max-w-main` to Container |
| `--max-width-small` | `80rem` | narrow cap |
| `--grid-cols` | `12` | column count |

Edit the clamp min/max at [tokens.css:22](app/assets/css/tokens.css#L22) to retune the
edge margin.

## Quick checklist

- Wrap content in `<Container>`; grid via `grid grid-cols-12 gap-gutter` inside it.
- Pinned/overlay elements: just `absolute`/`fixed` inside Container — no `px-gutter`.
- Filling the last column → `col-end-13`.
- Verify alignment with **Shift+G**.
