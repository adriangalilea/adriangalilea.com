import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";
import { Children, isValidElement, type ReactElement } from "react";
import { Card } from "@/components/card";
import { Lightbox } from "@/components/lightbox";
import { getContentByPath, isNote } from "@/lib/content";
import { renderMDXString } from "@/lib/mdx";

async function ContentQuote({ slug }: { slug: string }) {
  const parts = slug.split("/");
  const note = getContentByPath(parts);
  if (!note || !isNote(note)) return null;
  const { mdxContent } = await renderMDXString(
    note.content,
    getMDXComponents(),
  );
  return (
    <div className="not-prose my-6">
      <Card content={note} renderedNoteContent={mdxContent} />
    </div>
  );
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
    ContentQuote,
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
