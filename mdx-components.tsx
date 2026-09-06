import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";
import { Children, isValidElement, type ReactElement } from "react";
import { Card } from "@/components/card";
import { Bars, CompareBars, CompareLines } from "@/components/charts";
import { Pre } from "@/components/code-block";
import { type Picture, Zoomable } from "@/components/media-lightbox";
import { Quote } from "@/components/ui/quote";
import { YouTube } from "@/components/youtube";
import { getContentByPath, isNote } from "@/lib/content";
import { SERIF_CH } from "@/lib/faces";
import { renderMDX } from "@/lib/mdx";

function Prediction({ children }: { children: React.ReactNode }) {
  return (
    <div className="not-prose my-6 rounded-xl glass-card overflow-hidden p-4">
      <div className="prose prose-sm max-w-none prose-p:my-3 prose-p:leading-relaxed">
        {children}
      </div>
    </div>
  );
}

async function ContentQuote({ slug }: { slug: string }) {
  const parts = slug.split("/");
  const note = getContentByPath(parts);
  if (!note || !isNote(note)) return null;
  const mdxContent = await renderMDX(note.content, getMDXComponents());
  return (
    <div className="not-prose my-6">
      <Card content={note} renderedNoteContent={mdxContent} />
    </div>
  );
}

/** The plain words inside a rendered node tree - what a blockquote says, without its
 *  markup - for the card's measure. */
function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node))
    return textOf((node.props as { children?: React.ReactNode }).children);
  return "";
}

/** A measured pixel count as it arrives from compiled MDX: hast serializes every
 *  attribute as a string, so rehype-image-size's `1216` reaches the component as
 *  `"1216"`. Null for anything that is not a positive whole number. */
function px(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** The first image inside a figure, as the lightbox needs it. A local image carries
 *  the width and height rehype-image-size measured; a remote one has no measured size
 *  and does not open, it is just shown. */
function findPicture(children: React.ReactNode): Picture | null {
  let found: Picture | null = null;
  Children.forEach(children, (child) => {
    if (found || !isValidElement(child)) return;
    const props = child.props as Record<string, unknown>;
    if (typeof props.src === "string") {
      const width = px(props.width);
      const height = px(props.height);
      if (width && height)
        found = {
          src: props.src,
          width,
          height,
          alt: typeof props.alt === "string" ? props.alt : "",
        };
      return;
    }
    if (props.children) found = findPicture(props.children as React.ReactNode);
  });
  return found;
}

export function getMDXComponents(): MDXComponents {
  return {
    Bars,
    CompareBars,
    CompareLines,
    ContentQuote,
    Prediction,
    YouTube,
    pre: Pre,
    // A MARKDOWN BLOCKQUOTE IS A QUOTATION, so it is the same object as every other quote
    // on the site: the prose weight of @ag/quote, not a bespoke italic box. The site's
    // convention writes the attribution as the blockquote's last line, `- Plato`, which
    // markdown parses as a one-item LIST (the old CSS drew the dash as its marker); a
    // trailing paragraph opening with a dash is the same convention spelled out. Either
    // is lifted into the <cite> so the card carries it the way it carries an author.
    blockquote: ({ children }) => {
      const nodes = Children.toArray(children).filter(isValidElement);
      const last = nodes[nodes.length - 1];
      const tag = last ? (last.type as string) : "";
      const text = last ? textOf(last).trim() : "";
      const cited =
        tag === "ul" || tag === "ol" || /^[—–-]\s+/.test(text)
          ? text.replace(/^[—–-]\s+/, "")
          : null;
      const body = cited !== null ? nodes.slice(0, -1) : nodes;
      return (
        <Quote
          variant="prose"
          text={body.map(textOf).join(" ")}
          author={cited !== null ? { name: cited } : undefined}
          ch={SERIF_CH}
          className="not-prose my-6"
        >
          {body}
        </Quote>
      );
    },
    a: ({ href, children, ...props }) => {
      if (href?.startsWith("/") || href?.startsWith("#")) {
        return (
          <Link href={href} {...props}>
            {children}
          </Link>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    },
    figure: ({ children, ...props }) => {
      const picture = findPicture(children);

      let imgNode: React.ReactNode = null;
      let captionNode: React.ReactNode = null;

      Children.forEach(children, (child) => {
        if (!isValidElement(child)) return;
        const el = child as ReactElement<Record<string, unknown>>;
        if (
          el.type === "figcaption" ||
          (el.props && el.props.mdxType === "figcaption")
        ) {
          captionNode = el;
        } else {
          imgNode = child;
        }
      });

      if (!picture) {
        return <figure {...props}>{children}</figure>;
      }

      // The figcaption stays the figure's: the lightbox reads it as the caption at open.
      return (
        <figure {...props}>
          <Zoomable picture={picture}>{imgNode}</Zoomable>
          {captionNode}
        </figure>
      );
    },
    img: ({ src, alt, width, height, ...props }) => {
      if (!src) return null;
      const isExternal = typeof src === "string" && src.startsWith("http");
      const isBadge =
        isExternal &&
        /shields\.io|pepy\.tech\/badge|badgen\.net|badge/.test(src);
      if (isBadge) {
        return <img src={src} alt={alt ?? ""} className="badge" {...props} />;
      }
      if (isExternal) {
        return <img src={src} alt={alt ?? ""} {...props} />;
      }
      // A local image arrives measured (rehype-image-size); the box is reserved at its
      // real proportions, never at a guess.
      const w = px(width);
      const h = px(height);
      if (!w || !h)
        throw new Error(`image ${src} reached the renderer unmeasured`);
      const isAnimated = typeof src === "string" && src.endsWith(".gif");
      return (
        <Image
          src={src}
          alt={alt ?? ""}
          width={w}
          height={h}
          className="rounded-lg"
          unoptimized={isAnimated}
          {...props}
        />
      );
    },
  };
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...getMDXComponents(),
    ...components,
  };
}
