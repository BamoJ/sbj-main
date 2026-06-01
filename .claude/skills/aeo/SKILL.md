---
name: aeo
description: Answer Engine Optimization — optimize the starter for AI crawlers (Perplexity, ChatGPT Search, Claude, Google AI Overviews) and autonomous agents. Covers llms.txt, AI bot directives, per-page noai opt-out, and the switching-to-real-project checklist.
user-invokable: true
---

# AEO — Answer Engine + Agentic Optimization

## What this is

AEO = optimizing for AI engines (Perplexity, ChatGPT Search, Claude, Google AI Overviews, Bing Copilot) and autonomous browsing agents. Sits alongside [SEO](../seo/SKILL.md), shares the same `@nuxtjs/seo` infrastructure, adds:

- **`public/llms.txt`** — emerging standard ([llmstxt.org](https://llmstxt.org/)) — markdown overview of the site for LLM consumers.
- **AI bot policy** in the robots config — explicit allow/block per AI crawler (GPTBot, ClaudeBot, PerplexityBot, etc.).
- **Per-page AI opt-out** via `useSanitySeo('slug', { aiIndex: false })` → emits `<meta name="robots" content="noai, noimageai">`.
- **Sanity studio toggles** — `aiIndex` boolean on the seo object so clients control AI exposure per page from the CMS.

Honest framing: `llms.txt` is de-facto, not RFC'd. Adoption is growing (Anthropic, Perplexity, others). Costs almost nothing to ship; switching out costs the same. Worth doing now.

## What ships out of the box

- **`public/llms.txt`** — stub markdown describing the site, with placeholder content keyed to `localhost:3000` URLs.
- **`robots.groups` config block** in [nuxt.config.ts](nuxt.config.ts) with ~9 commented AI user-agent blocks ready to uncomment per project policy.
- **`useSanitySeo` AI opt-out support** — pass `aiIndex: false` in defaults OR set it on the Sanity seo object.
- **Sanity studio** ([studio/schemas/objects/seo.ts](studio/schemas/objects/seo.ts)) — `aiIndex` and `articleSchema` boolean fields on every page's seo object.

## `public/llms.txt` reference

Spec: [llmstxt.org](https://llmstxt.org/). The file lives at the site root and follows a simple markdown structure:

```
# Site Name

> One-line description of what the site is.

## Pages

- [Page Name](https://site.com/path): Brief description
- [Another](https://site.com/other): Brief description

## Notes

Any context an LLM should have when answering questions about this site.
Render mode (SPA / SSG), sitemap location, content licensing, etc.
```

**What to write** — the description an AI engine should give when a user asks "what is this site?". Be concise, factual, link-rich. Treat it as if you're writing the AI-readable about-us.

**What NOT to write** — marketing fluff, calls to action, anything that looks like SEO keyword stuffing. AI engines penalize manipulation.

## AI bot inventory

Major user-agents and what each does. Update the `robots.groups` block in [nuxt.config.ts](nuxt.config.ts) to allow (default) or block per client policy.

| User-agent | Operator | Purpose |
|---|---|---|
| `GPTBot` | OpenAI | Training data for GPT models |
| `OAI-SearchBot` | OpenAI | ChatGPT Search index (separate from training) |
| `ClaudeBot` | Anthropic | Claude training + Claude.ai search |
| `Claude-Web` | Anthropic | Claude.ai user-initiated browsing |
| `PerplexityBot` | Perplexity | Perplexity search index + agent browsing |
| `Google-Extended` | Google | Gemini / Bard training (separate from Googlebot) |
| `Applebot-Extended` | Apple | Apple Intelligence training |
| `Bytespider` | ByteDance | Doubao + other ByteDance AI |
| `Meta-ExternalAgent` | Meta | Meta AI / Llama training |
| `Amazonbot` | Amazon | Alexa / Rufus / Amazon AI |
| `cohere-ai` | Cohere | Cohere model training |
| `Diffbot` | Diffbot | Knowledge graph + agent web data |

**Default state**: all allowed (no `groups` entries active). To block, uncomment the matching block in [nuxt.config.ts](nuxt.config.ts):

```ts
robots: {
  disallow: ['/admin', '/preview'],
  groups: [
    { userAgent: 'GPTBot', disallow: ['/'] },           // block GPT training only
    { userAgent: 'ClaudeBot', disallow: ['/'] },        // block Claude training
    { userAgent: 'Google-Extended', disallow: ['/'] },  // block Gemini training
    // Leave PerplexityBot, OAI-SearchBot allowed if you WANT to appear in
    // AI search results (training opt-out + search opt-in is a common policy).
  ],
},
```

**Common policies**:
- **Full allow** (default) — maximum AI discoverability, training fair game. Best for content/portfolio sites that want max reach.
- **Search yes, training no** — block `GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`. Allow `OAI-SearchBot`, `PerplexityBot`, `Claude-Web`. Common for IP-heavy sites that want to be findable but not trained on.
- **Full block** — disallow all AI user-agents. Brand/legal-restricted content.

## Per-page AI opt-out

Two ways:

**1. Hardcoded in the page** — pass `aiIndex: false` in the defaults:

```js
useSanitySeo('client-x-case-study', {
  title: 'Client X — Case Study',
  description: '...',
  aiIndex: false,   // emits <meta name="robots" content="noai, noimageai">
})
```

**2. Sanity studio toggle** — open the page's `seo` object, uncheck `Allow AI engines to index this page`. The Sanity value wins over the hardcoded default.

When `aiIndex: false`, the page emits:

```html
<meta name="robots" content="noai, noimageai">
```

This is honored by AI crawlers as a request to skip indexing and training on this page. It does NOT block traditional Google indexing — for that, use the standard `noindex` directive.

## JSON-LD for AI engines

AI engines weight structured data more heavily than traditional search does — they extract facts directly from JSON-LD. Three high-leverage schemas:

**Article** (content pages, case studies, blog posts) — tells AI engines this is a discrete article with an author, date, and headline:

```js
useSchemaOrg([
  defineArticle({
    headline: 'Project Case Study Title',
    image: '/images/case-study-hero.webp',
    datePublished: '2026-05-23',
    dateModified: '2026-05-23',
    author: { type: 'Person', name: 'Bimo Tri' },
  }),
])
```

When the Sanity page document has `articleSchema: true` set on its `seo` object, this is the signal to add an Article block.

**BreadcrumbList** (nav hierarchy) — gives agents a structural map of where this page sits:

```js
useSchemaOrg([
  defineBreadcrumb({
    itemListElement: [
      { name: 'Work', item: '/work' },
      { name: 'Project Title', item: '/work/project-slug' },
    ],
  }),
])
```

**FAQPage** (Q&A sections) — high-value for AI engines answering user questions. If a page has a real FAQ, emit it:

```js
useSchemaOrg([
  defineQuestion({
    name: 'What services does the studio offer?',
    acceptedAnswer: 'Design systems, motion design, and WebGL experiences.',
  }),
  defineQuestion({
    name: 'How do I start a project?',
    acceptedAnswer: 'Email hi@bamoj.com with project context and timeline.',
  }),
])
```

`defineArticle`, `defineBreadcrumb`, `defineQuestion` are auto-imported from `@nuxtjs/schema-org` (bundled in `@nuxtjs/seo`).

## Switching to a real client project — checklist

Run through these alongside the [SEO skill](../seo/SKILL.md) checklist when starting a new project:

1. **Edit `public/llms.txt`** — replace the description with the client's, swap the page list to match real routes, update the URL prefix to match `NUXT_PUBLIC_SITE_URL`. The note about SPA rendering can stay or be removed depending on render mode.

2. **Decide AI bot policy with the client** — pick one of the policies above (Full allow / Search-yes-training-no / Full block). Uncomment the matching `robots.groups` entries in [nuxt.config.ts](nuxt.config.ts).

3. **Identify per-page AI opt-outs** — any pages with proprietary or unreleased content the client wants excluded? Either set `aiIndex: false` in the page's `useSanitySeo` call OR flip the `aiIndex` toggle in the Sanity studio per page.

4. **Add Article JSON-LD where appropriate** — content pages (case studies, blog posts, project details) benefit. Marketing/landing pages don't. Use the `useSchemaOrg([defineArticle({...})])` pattern in those pages' setup.

5. **Add BreadcrumbList for nested routes** — if dynamic routes (`/work/[slug]`) exist, emit breadcrumb schema on each detail page.

6. **Add FAQPage where you have real Q&A** — contact page, services page, anywhere there are genuine user questions answered on-page.

7. **Verify**:
   ```bash
   bun dev
   curl http://localhost:3000/llms.txt              # returns the markdown
   curl http://localhost:3000/robots.txt            # includes the AI bot rules
   ```
   View source on a page with `aiIndex: false` set → confirm `<meta name="robots" content="noai, noimageai">` present.
   View source on a page with Article schema → confirm the JSON-LD `<script type="application/ld+json">` block contains the Article type.

## When AEO matters (and when it doesn't)

**Matters most for**:
- Content-heavy sites (blog posts, case studies, technical docs) — AI engines cite these in answers.
- Service businesses where customers research via AI ("best motion design studios" type queries).
- Anything with FAQ-style content — direct answer machine fodder.

**Matters less for**:
- Landing pages with little text — AI engines have nothing structured to extract.
- E-commerce with rapidly changing inventory — `llms.txt` goes stale fast.
- Internal tools / authenticated experiences — AI crawlers shouldn't be there anyway.

For this starter (studio/portfolio template), AEO is worth the small scaffold cost. Most clients benefit from cited mentions in AI search.

## Future enhancements (deferred)

- **`llms-full.txt`** — full content markdown export of the site. Bigger lift: needs a Sanity → markdown rendering pipeline + a Nitro route to serve it. Defer until a real project needs it.
- **`.md` shadow routes** — serve `/about.md`, `/work.md` etc. for AI consumers who prefer plain text. Same defer reasoning as `llms-full.txt`.
- **Dynamic Article schema auto-emit** — automatically emit Article JSON-LD when a Sanity page has `articleSchema: true` set. The Sanity schema toggle is there; the auto-emit logic is a follow-up wire.
- **Structured Person schema** for team pages.
- **Product schema** if the studio ever sells things.

## Cross-references

- [seo](../seo/SKILL.md) — the parent SEO scaffold (sister skill)
- [sanity](../sanity/SKILL.md) — the prefetch pipeline + studio schema model
- [new-project](../new-project/SKILL.md) — clone-to-deploy walkthrough; cross-links here for AEO setup

## Key files

- [public/llms.txt](public/llms.txt) — site-level AI overview
- [nuxt.config.ts](nuxt.config.ts) `robots:` block — AI bot policy
- [app/composables/useSanitySeo.js](app/composables/useSanitySeo.js) — `aiIndex` opt-out emit logic
- [studio/schemas/objects/seo.ts](studio/schemas/objects/seo.ts) — `aiIndex` + `articleSchema` Sanity fields
