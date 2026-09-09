"use client";

// The site's two ways into @ag/lightbox for a picture that opens ALONE: an article
// figure or a cover you click, and the expand button on a feed card. Both are
// `LightboxSolo` (its own provider around one trigger), so a post with five figures
// is five viewers, the way each figure reads on the page, never one reel.
//
// A CLIENT MODULE on purpose: the trigger clones a `render` element, and an element
// created in a server component arrives across the boundary without its props (the
// avatar item learned this in prerender). mdx-components and the cards are server
// code, so the element is made here, on the trigger's side.

import { Expand } from "lucide-react";
import type { ReactNode } from "react";
import { type Entry, LightboxSolo } from "@/components/ui/lightbox";

export type Picture = {
  /** The file the page shows and the lightbox opens: one rendition, no larger one. */
  src: string;
  /** Natural pixels, measured at build (image-size); the lightbox sizes and flies by them. */
  width: number;
  height: number;
  alt: string;
  /** A CSS background under the image while it decodes: the cover's blur data url. */
  blur?: string | null;
};

const isGif = (src: string) => /\.gif$/i.test(src);

function entryOf(p: Picture): Entry {
  return {
    id: p.src,
    media: {
      kind: isGif(p.src) ? "gif" : "image",
      source: {
        src: p.src,
        full: p.src,
        width: p.width,
        height: p.height,
        ...(p.blur ? { blur: `url(${p.blur})` } : {}),
      },
      alt: p.alt,
    },
  };
}

/** The picture itself is the trigger: an article figure, a page cover. The anchor takes
 *  the picture's own radius (`.prose img` is 0.75rem; a cover passes `rounded-2xl`) so
 *  the focus ring the browser draws after the lightbox closes on Escape follows the
 *  corners instead of boxing them. The ring stays: it is how a keyboard finds its way
 *  back. */
export function Zoomable({
  picture,
  radius = "rounded-xl",
  children,
}: {
  picture: Picture;
  radius?: string;
  children: ReactNode;
}) {
  return (
    <LightboxSolo
      entry={entryOf(picture)}
      label="picture"
      render={
        <a
          href={picture.src}
          className={`not-prose block cursor-zoom-in outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring ${radius}`}
          aria-label={picture.alt || "picture"}
        />
      }
    >
      {children}
    </LightboxSolo>
  );
}

/** A corner button over a feed card's cover. The card around it is a link, so the
 *  button stops its own click: ClickableWrapper already ignores clicks that land on a
 *  button, and the trigger prevents the anchor default it never had. */
export function ExpandButton({ picture }: { picture: Picture }) {
  return (
    <LightboxSolo
      entry={entryOf(picture)}
      label="picture"
      render={
        <button
          type="button"
          aria-label="Expand image"
          className="absolute bottom-2 right-2 z-10 rounded-full bg-black/40 p-1.5 text-white/80 hover:text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 sm:opacity-0 max-sm:opacity-70"
        />
      }
    >
      <Expand className="size-3.5" />
    </LightboxSolo>
  );
}
