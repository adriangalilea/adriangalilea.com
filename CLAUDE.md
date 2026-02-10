# adriangalilea.com

Next.js personal site.

`pnpm dev` to run
`pnpm check`
`pnpm lint`
`pnpm format`
`pnpm build`

## Content Architecture

All content lives in `content/` as `.md` or `.mdx` files. Three content types, determined by frontmatter + body length:

### Note

No `title` in frontmatter. Body must be <= 280 chars. Renders as a short card.

```yaml
---
publishedAt: 2026-02-06
coverWidth: 480
coverHeight: 264
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
| `publishedAt` | date | null | Publication date. Required for content to appear in feeds. |
| `isDraft` | boolean | false | Hidden from listings but still accessible by URL. |
| `isPublished` | boolean | true | `false` = completely hidden, not even parsed. |
| `coverLoop` | boolean | true | Whether animated covers loop. |
| `coverWidth` | number | null | Manual width for animated covers without poster image. |
| `coverHeight` | number | null | Manual height for animated covers without poster image. |

### Page only

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | **required** | Presence of title is what makes it a Page (vs Note). |
| `description` | string | null | Subtitle / meta description. |
| `tags` | string[] | [] | Used for filtering and recommendations. |
| `updatedAt` | date | null | Shows "updated" badge if within 30 days. |
| `pinned` | boolean | false | Boosts scoring in featured listings. |

### Note only

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `tags` | string[] | [] | Same as Page. |
| `source` | string | null | URL attribution (used for quotes). |

### Folder only

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `"folder"` | **required** | What makes it a Folder. |
| `title` | string | directory name | Display name. |
| `description` | string | null | One-liner. |
| `status` | `"soon"` \| `"shipped"` \| `"lab"` \| `"sunset"` | null | Project status badge. |
| `links` | Record<string, string> | {} | Named URLs. Keys like `github`, `site`, etc. |
| `kpis` | { label, value }[] | [] | Key metrics displayed on the folder card. |
| `techs` | string[] | [] | Technology tags. |
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
    on-timestamps.md              # Note (no title, <= 280 chars, has source URL)
```

Embed in other content with `<ContentQuote slug="quotes/satoshi-nakamoto/on-timestamps" />`.

## Covers

`resolveCover()` scans for `cover.*` in the content directory (not `public/`). Priority: `.png .webp .jpg .jpeg .gif .mp4 .webm .mov`. Auto-copied to `public/` at build.

For animated covers (gif/video), place a `poster.*` image alongside for the static crossfade preview. Poster priority: `.webp .jpg .jpeg .png`.

If an animated cover has no poster, set `coverWidth`/`coverHeight` in frontmatter manually.

Preferred format for animated covers is `.webm`. The build warns about non-webm animated files.

## Media in articles

Images/media referenced with `./filename` get rewritten to `/${slugPath}/filename`. Place media files next to the `.md` file in the content directory; they get copied to `public/` automatically.

## Blur placeholders

`scripts/generate-blur.mjs` pre-generates blur data URLs for cover/poster images into `.next/blur-manifest.json`. Runs before `dev` and `build`. Adding a new cover while `next dev` is running requires a restart.

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
| `principles.md` | `~/self/writing/principles.md` |
| `why-i-hate-apple.md` | `~/self/writing/notes/xdg-over-apple.md` + `~/Documents/writings/notes/why_I_hate_apple.md` |
| `backstory.md` | `~/Documents/writings/Obsidian Vault/site/Adrian Galilea.md` |
| `quotes/` (Carmack, Ango, Peterson) | `~/self/writing/references/{carmack-constraints,ango-style-constraint,peterson-rules-freedom}.md` |

### Not yet imported

#### Essays / opinion pieces
- `~/Documents/writings/blog/blog/writings/posts/accesibility_is_all_you_need.md` - "We don't need new standards for AI" (CLAUDE.md/llm.txt/MCP are wrong, accessibility is the answer). Sub-essays in `atoms/` directory.
- `~/Documents/writings/blog/blog/writings/posts/its_simpler.md` - "It's always simpler" (tiny stub)
- `~/Documents/writings/notes/why_I_hate_taskwarrior.md` - Taskwarrior rant

#### Old project writeups (Obsidian Vault)
- `~/Documents/writings/Obsidian Vault/site/blog/1ALPHA.md` - Gaming platform project (2013-2020)
- `~/Documents/writings/Obsidian Vault/site/blog/Magic Sleeve.md` - DIY magnetic laptop sleeve
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

- Add Vercel Analytics for traffic analysis
- Add comment section with GitHub and Telegram auth using Better Auth
- Add email  ramih baiteh email
- Add backstory page
- Generate OG images for quotes (author avatar + quote text + author name)
- Clean up stale duplicates at source locations after confirming site versions are canonical
