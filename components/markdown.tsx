import type { ReactNode } from "react";
import { Card } from "@/components/card";
import { CodeBlock } from "@/components/code-block";
import { GitHub, Telegram, Tweet } from "@/components/embeds";
import { Bars, CompareLines } from "@/components/mdx-lazy";
import { Zoomable } from "@/components/media-lightbox";
import { Image } from "@/components/ui/image";
import { Link } from "@/components/ui/link";
import { Markdown, type MarkdownImage } from "@/components/ui/markdown";
import type { QuoteProps } from "@/components/ui/quote";
import { Quote } from "@/components/ui/quote";
import { YouTube as Video } from "@/components/ui/youtube";
import { getContentByPath, imageBlur, isNote } from "@/lib/content";
import { SERIF_CH } from "@/lib/faces";
import { treeOf } from "@/lib/markdown";
import { cn } from "@/lib/utils";

// A PIECE'S BODY: its markdown, prepared once (lib/markdown) and drawn by ui's
// `markdown` in its look, which is this site's. What is the site's own is how a few
// things are drawn: a link inside the site through its router, a picture through the
// site's loader and blur and opening in the lightbox, a code block in the site's frame,
// a quotation set in the site's serif, and the tags a piece may name (lib/markdown
// TAGS).

/** A prediction, set apart on a card: its words drawn by the piece, tight. */
function Prediction({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl glass-card overflow-hidden p-4 text-sm leading-relaxed text-foreground-low [&_p]:my-3 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
      {children}
    </div>
  );
}

/** A video by its id, as a piece names it (`<YouTube id="…" title="…" />`): ui's
 *  player, its thumbnail until it is played. */
function YouTube({ id, title }: { id: string; title?: string }) {
  return <Video video={{ id, title, short: false }} />;
}

/** A note of the site's, embedded in a piece as its card. */
async function ContentQuote({ slug }: { slug: string }) {
  const note = getContentByPath(slug.split("/"));
  if (!note || !isNote(note))
    throw new Error(`<ContentQuote slug="${slug}"> names no note`);
  return (
    <Card
      content={note}
      renderedNoteContent={<Body source={note.content} className={QUOTED} />}
    />
  );
}

/** A body set inside something that sets its words (a quote, a feed card): it takes
 *  their colour and leading, its paragraphs a short step apart. */
export const QUOTED = "text-inherit leading-[inherit] [&>p+p]:mt-[0.75em]";

const ELEMENTS = {
  Bars,
  CompareLines,
  ContentQuote,
  GitHub,
  Prediction,
  Telegram,
  Tweet,
  YouTube,
};

/** A link inside the site goes through its router; one away opens a tab. */
function SiteLink({ href, children, ...props }: React.ComponentProps<"a">) {
  if (href?.startsWith("/") || href?.startsWith("#"))
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

/** A badge (shields.io and its kind) is a small picture in a line of text. */
const BADGE = /shields\.io|pepy\.tech\/badge|badgen\.net|badge/;

/** A picture: one of the site's, measured as it was prepared, at the site's sizes
 *  and over its blur; another site's, shown as it is. */
function SitePicture({ src, alt, title, width, height }: MarkdownImage) {
  if (BADGE.test(src))
    return (
      <Image
        src={src}
        alt={alt}
        title={title}
        className="my-0 inline-block h-5 w-auto rounded-sm align-middle"
      />
    );
  if (!src.startsWith("/")) return <Image src={src} alt={alt} title={title} />;
  if (!width || !height)
    throw new Error(`image ${src} reached the page unmeasured`);
  return (
    <Image
      src={src}
      alt={alt}
      title={title}
      width={width}
      height={height}
      sizes="(max-width: 768px) 100vw, 768px"
      className="cover-contained w-full"
      blurDataURL={imageBlur(src)}
      unoptimized={src.endsWith(".gif")}
    />
  );
}

/** A figure opens its picture in the lightbox, captioned as it is here; a picture
 *  from another site, unmeasured, is only shown. */
function SiteFigure({
  image,
  caption,
  children,
}: {
  image: MarkdownImage;
  caption?: ReactNode;
  children: ReactNode;
}) {
  const { src, alt, width, height } = image;
  return (
    <figure>
      {width && height ? (
        <Zoomable picture={{ src, width, height, alt }}>{children}</Zoomable>
      ) : (
        children
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function SiteQuote(props: QuoteProps) {
  return <Quote {...props} ch={SERIF_CH} />;
}

/** A piece's markdown, drawn. */
export async function Body({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  return (
    <Markdown
      tree={await treeOf(source)}
      elements={ELEMENTS}
      components={{
        a: SiteLink,
        img: SitePicture,
        figure: SiteFigure,
        pre: CodeBlock,
        blockquote: SiteQuote,
      }}
      // The site's reading measure: its body colour, a little more air between lines.
      className={cn("leading-[1.8] text-foreground-low", className)}
    />
  );
}
