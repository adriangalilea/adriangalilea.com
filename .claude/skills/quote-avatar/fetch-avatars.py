#!/usr/bin/env python3
"""Fetch author avatars from Wikipedia for the quotes collection.

Downloads and converts to avatar.png (satori/vercel OG compatible, lossless).
Uses macOS sips for format conversion and resizing.
"""

import json
import subprocess
import urllib.request
from pathlib import Path

QUOTES_DIR = Path(__file__).resolve().parents[3] / "content" / "quotes"

# Must match AVATAR_EXTENSIONS in lib/media.ts
AVATAR_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg"]

# slug -> Wikipedia article title
# Empty string = needs user input, skip automatically
WIKI_MAP = {
    "alan-watts": "Alan_Watts",
    "albert-einstein": "Albert_Einstein",
    "allen-steble": "",
    "arthur-schopenhauer": "Arthur_Schopenhauer",
    "benjamin-franklin": "Benjamin_Franklin",
    "bible": "Bible",
    "blaise-pascal": "Blaise_Pascal",
    "bruce-lee": "Bruce_Lee",
    "bullric-wall": "",
    "carl-jung": "Carl_Jung",
    "confucius": "Confucius",
    "dario-amodei": "Dario_Amodei",
    "david-mccullough-jr": "",
    "edgar-allan-poe": "Edgar_Allan_Poe",
    "eric-gill": "Eric_Gill",
    "felipe-ii": "Philip_II_of_Spain",
    "friedrich-nietzsche": "Friedrich_Nietzsche",
    "george-clemenceau": "Georges_Clemenceau",
    "george-orwell": "George_Orwell",
    "george-santayana": "George_Santayana",
    "guillermo-rauch": "",
    "h-g-wells": "H._G._Wells",
    "henry-ford": "Henry_Ford",
    "james-clear": "James_Clear",
    "john-carmack": "John_Carmack",
    "john-f-kennedy": "John_F._Kennedy",
    "john-mcafee": "John_McAfee",
    "jony-ive": "Jony_Ive",
    "jordan-peterson": "Jordan_Peterson",
    "kyle-clark": "",
    "marcus-aurelius": "Marcus_Aurelius",
    "mark-twain": "Mark_Twain",
    "matt-haig": "Matt_Haig",
    "miguel-de-cervantes": "Miguel_de_Cervantes",
    "napoleon": "Napoleon",
    "naval-ravikant": "Naval_Ravikant",
    "nicolas-gomez-davila": "Nicolás_Gómez_Dávila",
    "pyotr-tchaikovsky": "Pyotr_Ilyich_Tchaikovsky",
    "ralph-waldo-emerson": "Ralph_Waldo_Emerson",
    "richard-feynman": "Richard_Feynman",
    "rumi": "Rumi",
    "satoshi-nakamoto": "",
    "steph-ango": "",
    "sun-tzu": "Sun_Tzu",
    "terence": "Terence_(playwright)",
    "vladimir-lenin": "Vladimir_Lenin",
    "winston-churchill": "Winston_Churchill",
}


def get_wikipedia_image_url(title: str) -> str | None:
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.request.quote(title)}"
    req = urllib.request.Request(url, headers={"User-Agent": "quote-avatar-fetcher/1.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        return (
            data.get("thumbnail", {}).get("source")
            or data.get("originalimage", {}).get("source")
        )
    except Exception as e:
        print(f"  Wikipedia API error: {e}")
        return None


def download_as_png(url: str, dest: Path) -> bool:
    """Download image and convert to 256x256 png via sips (macOS)."""
    req = urllib.request.Request(url, headers={"User-Agent": "quote-avatar-fetcher/1.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            tmp = dest.with_suffix(".tmp")
            tmp.write_bytes(resp.read())
        result = subprocess.run(
            ["sips", "-s", "format", "png", "-z", "256", "256", str(tmp), "--out", str(dest)],
            capture_output=True,
        )
        tmp.unlink(missing_ok=True)
        return result.returncode == 0 and dest.exists()
    except Exception as e:
        print(f"  Download error: {e}")
        return False


def main():
    assert QUOTES_DIR.is_dir(), f"Quotes directory not found: {QUOTES_DIR}"

    missing = []
    for d in sorted(QUOTES_DIR.iterdir()):
        if not d.is_dir():
            continue
        if any((d / f"avatar{ext}").exists() for ext in AVATAR_EXTENSIONS):
            continue
        missing.append(d.name)

    if not missing:
        print("All authors have avatars!")
        return

    print(f"{len(missing)} authors missing avatars:\n")

    ok = []
    need_input = []
    failed = []

    for slug in missing:
        wiki_title = WIKI_MAP.get(slug)

        if wiki_title is None:
            print(f"  UNKNOWN  {slug} (add to WIKI_MAP in script)")
            need_input.append(slug)
            continue

        if wiki_title == "":
            print(f"  SKIP     {slug} (needs user-provided image)")
            need_input.append(slug)
            continue

        img_url = get_wikipedia_image_url(wiki_title)
        if not img_url:
            print(f"  NO_IMAGE {slug} (wiki: {wiki_title})")
            need_input.append(slug)
            continue

        avatar = QUOTES_DIR / slug / "avatar.png"

        if download_as_png(img_url, avatar):
            print(f"  OK       {slug}")
            ok.append(slug)
        else:
            print(f"  FAIL     {slug}")
            failed.append(slug)

    print(f"\n--- Results ---")
    print(f"  Fetched:    {len(ok)}")
    print(f"  Need input: {len(need_input)}")
    print(f"  Failed:     {len(failed)}")

    if need_input:
        print(f"\nAuthors needing user-provided images:")
        for s in need_input:
            print(f"  - {s}")

    if failed:
        print(f"\nAuthors that failed:")
        for s in failed:
            print(f"  - {s}")


if __name__ == "__main__":
    main()
