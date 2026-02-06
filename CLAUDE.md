# adriangalilea.com

Next.js personal site. `pnpm dev` to run.

## Content Architecture

All content lives in `content/`. Three content types determined by structure:

### Note
A single `.mdx` file with body <= 280 chars, no `type: folder` frontmatter.

### Page
A single `.mdx` file with body > 280 chars (or a folder's `index.mdx`).

### Folder (Project)
A directory with `index.mdx` containing `type: folder` frontmatter.

```
content/my-project/
  index.mdx          # type: folder — defines the project (title, description, status, links)
  overview.mdx        # a Page inside the project
```

#### Nesting posts inside folders

To give a post its own cover and sub-content, convert it from a flat `.mdx` into a subfolder:

```
# BEFORE: flat file, no cover
content/my-project/overview.mdx

# AFTER: subfolder with its own cover
content/my-project/overview/
  index.mdx           # the article content (moved from overview.mdx)
  cover.webm           # cover media for this specific post
```

The `index.mdx` inside the subfolder becomes the post. Any `cover.*` file next to it becomes that post's cover.

### Covers

`resolveCover()` scans for `cover.*` in the content directory (not `public/`). Supported extensions in priority order: `.png .webp .jpg .jpeg .gif .mp4 .webm .mov`. The file is auto-copied to `public/` at build time.

For animated covers (gif/video), place a `poster.*` image alongside for the static preview.

### Media in articles

Images/media referenced in `.mdx` with `./filename` get rewritten to `/${slugPath}/filename`. The files must exist in `public/${slugPath}/`.

### X-ray cards

Folders without a cover render as "x-ray" cards in the grid — they show a preview of their top child page (via `MiniPageCard`). If a folder has a cover, it renders as a regular `FolderCard` instead.

## TODO

- Add Vercel Analytics for traffic analysis
- Add comment section with GitHub and Telegram auth using Better Auth
- Add email via Resend (ramih@baiteh.com)
- Add backstory page
