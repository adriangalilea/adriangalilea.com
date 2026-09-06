import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";
import { Children, isValidElement, type ReactElement } from "react";
import { Card } from "@/components/card";
import { Bars, CompareBars, CompareLines } from "@/components/charts";
import { Pre } from "@/components/code-block";
import { Lightbox } from "@/components/lightbox";
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

function findImgSrc(children: React.ReactNode): string | null {
  let src: string | null = null;
  Children.forEach(children, (child) => {
    if (src) return;
    if (isValidElement(child)) {
      const props = child.props as Record<string, unknown>;
      if (props.src && typeof props.src === "string") {
        src = props.src;
      }
      if (props.children) {
        src = findImgSrc(props.children as React.ReactNode);
      }
    }
  });
  return src;
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
    // convention writes the attribution as a last line starting with an em dash - it is
    // lifted into the <cite> so the card carries it the way it carries an author.
    blockquote: ({ children }) => {
      const nodes = Children.toArray(children).filter(isValidElement);
      const last = nodes[nodes.length - 1];
      const by = last ? textOf(last).trim() : "";
      const cited = /^[—–-]\s*/.test(by);
      const body = cited ? nodes.slice(0, -1) : nodes;
      return (
        <Quote
          variant="prose"
          text={body.map(textOf).join(" ")}
          author={cited ? { name: by.replace(/^[—–-]\s*/, "") } : undefined}
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
      const src = findImgSrc(children);

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

      if (!src) {
        return <figure {...props}>{children}</figure>;
      }

      return (
        <figure {...props}>
          <Lightbox src={src} caption={captionNode}>
            {imgNode}
          </Lightbox>
          {captionNode}
        </figure>
      );
    },
    img: ({ src, alt, ...props }) => {
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
      const isAnimated = typeof src === "string" && src.endsWith(".gif");
      return (
        <Image
          src={src}
          alt={alt ?? ""}
          width={800}
          height={450}
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
