# adriangalilea.com

Next.js personal site.

**Drafts: the split is confidentiality, not draft-ness.** The repo is public but the site keeps drafts unpublished, so WIP that's fine being publicly visible can be committed here as we see fit. **Private drafts go to `~/Documents/drafts/` (iCloud) and never touch this repo.**

`pnpm dev` to run
`pnpm check`
`pnpm lint`
`pnpm format`
`pnpm build`

Commits are conventional, `type(scope): description`; `.githooks/commit-msg` refuses anything else, wired once per clone with `git config core.hooksPath .githooks`. `pnpm lint` is the gate and it covers `package.json` too; the `avatar.json` sidecars under `content/` are written by ui's `mise portrait` and excluded from it.

## Design references

- https://wsocial.news/ — style/visual reference
- https://read.cv/ — style/visual reference (defunct)

## Quality standard

Fix root causes, not symptoms. When something breaks, trace it to the actual mechanism (e.g., React portal event bubbling, not "add another stopPropagation"). Understand framework internals — surface-level API knowledge isn't enough.

Use the right tool for the job: React state for things that drive renders, refs for internal bookkeeping and gesture tracking, direct DOM mutations for 60fps animations. Native event listeners when React's abstractions get in the way (passive wheel events). Centralize invariants in one place (a single clamping effect) instead of scattering guards across every call site.

Every interactive component must handle all input methods: mouse, trackpad, touch, keyboard. Don't ship a gesture that only works on one device. Clamp everything — bounds, scales, thresholds. Guard against ghost interactions: drags shouldn't trigger clicks, closing overlays shouldn't trigger navigation, releasing outside a boundary shouldn't dismiss. Test the edges: drag past bounds, resize mid-interaction, switch from two fingers to one.

Keep CSS in Tailwind unless there's a specific reason not to. One hook for one interaction — don't split coupled state across multiple hooks to look clean. Expose the minimum API surface needed.

## Quotes are the `@ag/quote` pair, not a local component

A quote is drawn by ONE module at three weights and as a link preview, and all of it
comes from the registry at ui.adriangalilea.com (`components.json` maps `@ag`):
`components/ui/quote.tsx` + `quote.css` (the web card: `feature` on a quote's own page,
`prose` inside `Card` in the feed and in `ContentQuote` embeds) and `lib/quote-card.ts`
(the rules and `renderQuoteSvg`, the 1200×630 still the OG route rasterizes). Refresh a
copy with `mise add quote` run in the ui checkout: it installs the item AND its whole
dependency tree from the local build, so `quote-card` can never lag behind `quote.tsx`.
Never edit the copies, fix the registry and re-add. `app/tokens.css` is the `@ag/tokens`
copy, imported from globals.

**Everything the card needs from a portrait's pixels is ASSET PREPARATION, not a build
step.** `content/quotes/<author>/avatar.json` sits beside each `avatar.png` and holds
the two FACTS the card needs — `focus` (where the subject sits, from Vision) and
`average` (the picture's mean colour, RGB). The tone is derived at build by `toneFrom`,
pure arithmetic, so a rule change in the registry needs no re-annotation. `mise portrait` (ui repo) writes it when
it crops; `mise portraits content/quotes` writes any that are missing and never
overwrites one, so a value set by hand stays. `lib/content.ts` reads it into
`Folder.portrait` → `AuthorInfo.portrait`, and warns at build for a portrait without
one. Portrait placement reads the sidecar without decoding. Media preparation
uses Sharp before the Next build; it does not rerun Vision or portrait annotation.

The author's face in an attribution is `components/ui/avatar.tsx` (`@ag/avatar`),
positioned on the sidecar's `focus` and ringed in the tone; with the sidecar's `size` it
opens the portrait ALONE, captioned with the name (`LightboxSolo` inside the item: its
own provider, so a feed of faces is never one reel). Nothing is mounted in the layout
for it. **Every picture on the site opens through `@ag/lightbox`, alone**: article
figures and page covers via `Zoomable`, the corner button on a feed card via
`ExpandButton`, both in `components/media-lightbox.tsx` (a client module, because the
trigger's `render` element must be made on the client side). The lightbox needs a
picture's natural size, so `lib/rehype-image-size.ts` measures every local `<img>` at
compile time from `content/<slug>/<file>` (image-size) and writes width/height into the
hast; the `img` MDX component reserves the box at those proportions and THROWS for a
local image that arrives unmeasured, and the plugin throws for a local image that is
not on disk (that assert found a 404 that had been live for a year). hast serializes
attributes as strings, so `"1216"` is what reaches the component; `px()` parses it.
Remote images are shown, not opened. Pull items from the local ui checkout with
`mise run add <item> <site>`: it serves the local registry to shadcn, which resolves
the dependency graph. Run the site's formatter on installed files afterward.

What the site supplies beyond that: the words with markdown stripped, the formatted date
(`noteDate` in `lib/content.ts`), and a rasterizer. `lib/og.ts` renders the still with
**resvg**: it takes font FILES, so the three voices resolve to the faces they
name — Tinos (`lib/fonts/`, Apache 2.0, the same face `--font-quote` loads for the
page), Geist and Geist Mono from the `geist` package. **The quotes' face is Tinos, never
Instrument Serif**: the heading face is a condensed display serif and was illegible at
reading size the moment the quote inherited `--font-serif`; the item reads its own
`--font-quote` token, the site maps it to Tinos (next/font) and `SERIF_CH` in
`lib/faces.ts` is Tinos's measured advance. resvg is a native addon and is
listed in `serverExternalPackages`. EVERY note gets an OG card, Adrian's own included,
on the neutral ground. A page or folder with a cover gets the cover contained over a
blurred fill of itself, drawn by sharp from the cover file (an `og.png` beside the
content wins; a video cover previews with its poster).

## Content Architecture

All content lives in `content/` as `.md` or `.mdx` files. Three content types, determined by frontmatter + body length:

### Note

No `title` in frontmatter. Body must be <= 280 chars (`quotes/` and `predictions/`
are exempt). Renders as a short card.

```yaml
---
publishedAt: 2026-02-06
---
~~The everything APP~~ → The everything API
```

Has an optional `source` field (URL string) used for quotes.

### Page

Has `title` in frontmatter. Body can be any length. This is a blog post / article.

```yaml
---
title: "What is the best language for vibe coding?"
publishedAt: 2026-02-09
description: "Python vs Rust vs Elixir."
tags:
  - ai
  - python
---

Article body here...
```

**Do NOT put an h1 (`#`) in the body.** The `title` frontmatter field already renders as the page heading. An h1 in the body creates a duplicate title.

### Folder (Project)

A directory with `index.md` containing `type: folder` in frontmatter. Groups child content.

```yaml
---
type: folder
title: streamlit-shortcuts
description: Keyboard shortcuts for Streamlit buttons
status: shipped
links:
  github: https://github.com/adriangalilea/streamlit-shortcuts
---
```

Children live as sibling files or subdirectories inside the folder.

## Frontmatter Reference

### All content types

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `publishedAt` | date | null | When it went on the site. Required for content to appear in feeds. |
| `isDraft` | boolean | false | Hidden from listings but still accessible by URL. |
| `isPublished` | boolean | true | `false` = dropped at parse, never rendered. |

### Page only

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | **required** | Presence of title is what makes it a Page (vs Note). |
| `description` | string | null | Subtitle / meta description. |
| `tags` | string[] | [] | Used for filtering and recommendations. |
| `updatedAt` | date | null | Second date beside the published one; the card shows it only when later. |

### Note only

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `tags` | string[] | [] | Same as Page. |
| `source` | string | null | URL attribution (used for quotes). |
| `estimatedDate` | string | null | When the words were said (`"~500 BC"`). Shown instead of `publishedAt`, on the page and the OG card. |
| `verdict` | `"pending"` \| `"partial"` \| `"confirmed"` \| `"missed"` | null | A prediction's outcome badge. |
| `deadline` | string | null | When a prediction resolves. |

### Folder only

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `"folder"` | **required** | What makes it a Folder. |
| `title` | string | directory name | Display name. |
| `description` | string | null | One-liner. |
| `status` | `"soon"` \| `"shipped"` \| `"lab"` \| `"sunset"` | null | Project status badge. |
| `links` | Record<string, string> | {} | Named URLs. Keys like `github`, `site`, etc. |
| `feedThrough` | boolean | false | Children bubble up to the parent's parent (used for quotes). |

## How to create content

### Standalone page (most common)

Single `.md` file at `content/my-slug.md`:

```
content/my-slug.md
```

Slug = filename without extension. URL = `/my-slug`.

### Page with cover

Convert to a directory with `index.md` + `cover.*`:

```
content/my-slug/
  index.md
  cover.webp
```

### Page inside a project folder

```
content/my-project/
  index.md           # type: folder
  my-page.md         # a Page child
  my-page/           # OR: a Page child with its own cover
    index.md
    cover.webm
    poster.webp      # static preview for animated cover
```

### Quote (Note inside feedThrough chain)

```
content/quotes/
  index.md                        # type: folder, feedThrough: true
  satoshi-nakamoto/
    index.md                      # type: folder, feedThrough: true
    avatar.png                    # author avatar
    on-timestamps.md              # Note (no title, has source URL)
```

Embed in other content with `<ContentQuote slug="quotes/satoshi-nakamoto/on-timestamps" />`.

## Covers

`resolveCover()` scans for `cover.*` in the content directory (not `public/`). Priority: `.png .webp .jpg .jpeg .gif .avif .mp4 .webm .mov`. Auto-copied to `public/` at build.

For animated covers (gif/video), place a `poster.*` image alongside for the static crossfade preview. Poster priority: `.webp .jpg .jpeg .png .avif`.

An animated cover takes its dimensions from the poster; without one the grid sizes the
card as 16:9 and the build warns once.

MP4 and WebM are supported. Feed videos loop during hover/focus; article videos
play once on arrival, hold the final frame, then loop on a fresh hover/focus.
Controls are opt-in in the shared component. Native GIFs retain their encoded loop
behavior; prepare them as video when a finite play-once or boomerang is needed.

## Media in articles

Images/media referenced with `./filename` get rewritten to `/${slugPath}/filename`. Place media files next to the `.md` file in the content directory; they get copied to `public/` automatically.

## Blur placeholders

`scripts/generate-blur.mjs` prepares blur data URLs for local article images and
cover/poster images into `.source/media/blur-manifest.json`, before `dev` and `build`.
Generated inputs live outside `.next` so the production build cannot erase them.
Restart dev after adding media. Its cache includes the preparation recipe, so
processor changes regenerate placeholders even when original files are unchanged.

## X-ray cards

Folders without a cover render as "x-ray" cards showing a preview of their top child. Folders with a cover render as regular cards.

## View Counts

View counts are **client-side only**. Pages are 100% static (SSG via `generateStaticParams`), view counts hydrate after load.

**Feed/collection pages**: `ViewCountsProvider` wraps the grid, fetches all counts in one batch `GET /api/views/batch?slugs=a,b,c`. Each card renders `<FeedViewCount slug={...} />` which reads from React context.

**Individual pages**: `<ViewCounter slug={...} />` fetches its own count from `GET /api/views/{slug}`.

**Tracking**: `<TrackView>` / `<TrackViews>` fire `POST` requests to record visits.

### Why not `"use cache"` + Suspense (PPR)?

We tried server-side `"use cache"` with `cacheLife("minutes")` on `getViewCounts`. Problems:
1. Awaiting it in `CollectionView` blocked the entire page render (no Suspense boundary around it).
2. Moving it behind Suspense requires the cached data to flow into already-rendered cards, which means either context injection from a streamed component (complex) or per-card Suspense boundaries (N cache entries).
3. In dev, `"use cache"` doesn't cache reliably so every load hit the DB.

Client-side fetch is simpler, makes pages truly static (CDN-cacheable, zero server work), and view counts are non-critical enhancement data that every major site loads after paint.

### `cacheComponents` is OFF

Nothing uses `"use cache"` currently. If re-enabled, remember: `getAllContent()` does file copies (`cpSync`/`mkdirSync`) which trigger `Date.now()` internally, causing prerender warnings. The module-level memoization in `lib/content.ts` mitigates this by scanning once.

## Clickable card pattern (`clickable-wrapper.tsx`)

`<article>` with `onClick` + `onKeyDown` + `tabIndex={0}`. Biome's `noNoninteractiveTabindex` is disabled for this file via overrides because biome has no clean path for clickable cards: `role="link"` triggers `noNoninteractiveElementToInteractiveRole` + `useSemanticElements`. Wrapping the whole card in `<a>` would eliminate the override but changes DOM structure and may break the text-selection / drag-detection logic.

## Writing voice

When writing posts on my behalf, match my tone. Reference: `content/shapes-of-knowledge/index.md` (unfinished but representative). Short sentences. Conversational. Bold for emphasis. No em-dashes. No filler. Say things once. If it sounds like a blog post template, rewrite it.

## External Content Sources

Writing drafts and project notes live in several places outside this repo. This section tracks what's been imported and what's still pending.

### Imported (duplicates still exist at source)

These were copied into `content/` and adapted. The originals at source are stale duplicates.

| Content | Source(s) |
|---|---|
| `memory-is-not-an-afterthought.md` | `~/self/writing/notes/memory-is-not-an-afterthought.md` |
| `the-xy-problem.md` | `~/self/writing/references/xy-problem.md` |
| `why-i-hate-apple.md` | `~/self/writing/notes/xdg-over-apple.md` + `~/Documents/writings/notes/why_I_hate_apple.md` |
| `backstory.md` | `~/Documents/writings/Obsidian Vault/site/Adrian Galilea.md` |
| `quotes/` (Carmack, Ango, Peterson) | `~/self/writing/references/{carmack-constraints,ango-style-constraint,peterson-rules-freedom}.md` |
| `magic-sleeve/` | `~/Documents/writings/Obsidian Vault/site/blog/Magic Sleeve.md` + `~/Documents/quests/main/_adriangalilea/MagicSleeve/IMG_0247.jpeg` + Squarespace export |

### Not yet imported

#### Essays / opinion pieces
- `~/Documents/writings/blog/blog/writings/posts/accesibility_is_all_you_need.md` - "We don't need new standards for AI" (CLAUDE.md/llm.txt/MCP are wrong, accessibility is the answer). Sub-essays in `atoms/` directory.
- `~/Documents/writings/blog/blog/writings/posts/its_simpler.md` - "It's always simpler" (tiny stub)
- `~/Documents/writings/notes/why_I_hate_taskwarrior.md` - Taskwarrior rant
- Jordan B. Peterson zoom call (no source file yet)
- Ramih Baiteh (Carrefour CEO) email — congratulated Adrian's ideas (no source file yet)

#### Squarespace export (HTML versions of old posts)
- `~/Documents/media/hemeroteca/Squarespace-Wordpress-Export-03-04-2024.xml` — contains HTML versions of: 1ALPHA, Vvalue, Optimal auto-compounding on DeFi, Non-Fungible Thoughts (NFT's), Magic Sleeve (imported). Cross-reference with Obsidian Vault versions below.

#### Old project writeups (Obsidian Vault)
- `~/Documents/writings/Obsidian Vault/site/blog/1ALPHA.md` - Gaming platform project (2013-2020)
- `~/Documents/writings/Obsidian Vault/site/blog/Non-Fungible Thoughts (NFT's).md` - NFT opinion piece (Spanish/English mix)
- `~/Documents/writings/Obsidian Vault/site/blog/Optimal auto-compounding on DeFi.md` - DeFi auto-compounding tool
- `~/Documents/writings/Obsidian Vault/site/blog/Vvalue.md` - Portfolio valuation widget

#### Knowledge management
- `~/Documents/writings/blog/blog/SKM.md` - Self Knowledge Management protocol (related to self.fm / shapes-of-knowledge)
- `~/Documents/writings/self/CATEGORIES.md` - Knowledge categories taxonomy

#### self.fm design docs
- `~/Downloads/three-spaces-concept.md` - Three spaces (my/our/world) design
- `~/Downloads/platform-money-flows.md` - Monetization model
- `~/Downloads/consensus-editing-system.md` - Community editing system

#### Forma - contract system (imported as folder, not on GitHub yet)
- `~/Developer/_pattern/README.md` - Genesis writeup and manifesto (canonical source)
- NOTE: naming collision with `~/Developer/apple/forma` (iOS LiDAR app, separate project)

#### UFS project
- `~/ufs/design.md` - Universal File System technical spec
- `~/ufs/self.md` - UFS project overview

## TODO

- Masonry sorting is broken — especially visible at `/quotes`, the ordering algorithm fails
- Clean up stale duplicates at source locations after confirming site versions are canonical
- Run `vercel link` — the Vercel project exists and is live (`adriangalilea-com`, team adriangalileas-projects) but this local repo is unlinked, so `vercel env pull` / CLI ops won't work until linked

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
