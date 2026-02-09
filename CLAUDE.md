# adriangalilea.com

Next.js personal site. `pnpm dev` to run.

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
# What is the best language for vibe coding?

Article body here...
```

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

## TODO

- Add Vercel Analytics for traffic analysis
- Add comment section with GitHub and Telegram auth using Better Auth
- Add email  ramih baiteh email
- Add backstory page
- Generate OG images for quotes (author avatar + quote text + author name)
