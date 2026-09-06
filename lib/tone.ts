// THE PICTURE'S OWN COLOUR, for the quote card. `quote-card` cannot open a PNG — it has
// no runtime — so whoever holds the bytes averages them and passes a tone in. Here that is
// sharp, which the site already carries for covers: resample the whole portrait to ONE
// pixel, which is the average by definition, and hand the three channels to `toneFrom`.
//
// Cached by path. A feed renders every note's card, and every card of the same author
// would otherwise decode the same file again.

import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { type QuoteTone, toneFrom } from "@/lib/quote-card";

const cache = new Map<string, Promise<QuoteTone | null>>();

/** The tone of a public avatar path (`/quotes/mark-twain/avatar.png`), or null when the
 *  file is not there — a card without a picture is neutral, not broken. */
export function toneOf(avatar: string | null): Promise<QuoteTone | null> {
  if (!avatar) return Promise.resolve(null);
  const hit = cache.get(avatar);
  if (hit) return hit;
  const path = join(process.cwd(), "public", avatar);
  const tone = existsSync(path)
    ? sharp(path)
        .resize(1, 1, { fit: "fill" })
        .removeAlpha()
        .raw()
        .toBuffer()
        .then((px) => toneFrom(px[0], px[1], px[2]))
    : Promise.resolve(null);
  cache.set(avatar, tone);
  return tone;
}
