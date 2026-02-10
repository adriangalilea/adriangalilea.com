---
name: quote-avatar
description: Fetch and process author avatars for the quotes collection. Use when adding new quote authors who need portrait images, or when bulk-fetching missing avatars. Triggers on "fetch avatar", "get avatar", "quote avatar", or "missing avatars".
---

# Quote Avatar Fetcher

Fetches author portrait images from Wikipedia and converts them to 256x256 png avatars for the quotes collection at `content/quotes/`. PNG is used because satori (vercel/og) does not support webp.

## Usage

Run the script:
```bash
python3 .claude/skills/quote-avatar/fetch-avatars.py
```

It will:
1. Scan `content/quotes/*/` for authors missing `avatar.*` (checks `.png`, `.webp`, `.jpg`, `.jpeg` — matches `AVATAR_EXTENSIONS` in `lib/media.ts`)
2. Look up each author in its `WIKI_MAP` dictionary
3. Fetch the thumbnail from Wikipedia's REST API
4. Download and convert to 256x256 png via `sips` (macOS)
5. Report which authors need user-provided images

## Adding new authors

Add the slug-to-Wikipedia mapping in `fetch-avatars.py`'s `WIKI_MAP` dict:
```python
"new-author-slug": "Wikipedia_Article_Title",
```

Set to empty string `""` for authors that need manual/AI-generated images.

## Manual avatar from ~/Downloads

For authors the script can't fetch (anonymous, obscure, AI-generated):
```bash
SLUG="author-slug"
sips -s format png -z 256 256 ~/Downloads/image.jpg --out content/quotes/$SLUG/avatar.png
```

## Authors That Need User Input

Some authors don't have usable photos on Wikipedia. **ALWAYS ask the user** what they want to do for these — never silently skip or pick a default. The user may want to generate a custom portrait with AI (e.g. Stable Diffusion via Grok) which often looks far better than generic Wikipedia fallbacks.

Present the list of authors that failed and ask the user to either:
1. Provide images in `~/Downloads/` (they'll say when ready)
2. Skip them for now

## Requirements

- `sips` (built into macOS)
- `python3` (standard on macOS)
