import { PenLine } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionView, prepareGridItems } from "@/components/collection-view";
import { Comments } from "@/components/comments";
import { CoverImage } from "@/components/cover-image";
import { Grid } from "@/components/filterable-grid";
import { RelatedSection } from "@/components/related-section";
import { TOC } from "@/components/toc";
import { TrackView } from "@/components/track-view";
import { Quote } from "@/components/ui/quote";
import { VerdictInline } from "@/components/verdict-badge";
import { ViewCounter } from "@/components/view-counter";
import {
  type Folder,
  getAllContent,
  getAuthorForContent,
  getBacklinks,
  getContentByPath,
  getRecommendations,
  isFolder,
  isNote,
  isPage,
  type Note,
  noteDate,
  type Page,
} from "@/lib/content";
import { SERIF_CH } from "@/lib/faces";
import { renderMDX } from "@/lib/mdx";
import { formatDate, stripMarkdown } from "@/lib/utils";
import { getMDXComponents } from "@/mdx-components";

type Props = {
  params: Promise<{ slug?: string[] }>;
};

export default async function ContentPage({ params }: Props) {
  const { slug = [] } = await params;

  // Empty slug = root collection
  if (slug.length === 0) {
    return <CollectionView slug={[]} />;
  }

  const content = getContentByPath(slug);
  if (!content) notFound();

  if (isNote(content)) {
    return <NoteView note={content} />;
  }

  if (isPage(content)) {
    return <PageView page={content} />;
  }

  if (isFolder(content)) {
    return <CollectionView folder={content} slug={slug} />;
  }

  notFound();
}

// ============================================================================
// NOTE VIEW - minimal, tags + content + date
// ============================================================================

async function NoteView({ note }: { note: Note }) {
  const mdxContent = await renderMDX(note.content, getMDXComponents());
  const recs = getRecommendations(note, 6);
  const author = getAuthorForContent(note);
  const backlinks = getBacklinks(note);

  return (
    <article className="pb-16">
      <div className="mx-auto max-w-2xl px-6">
        {note.cover && (
          <figure className="mb-8 text-center">
            <CoverImage
              cover={note.cover}
              title=""
              width={note.coverWidth}
              height={note.coverHeight}
              poster={note.poster}
              blurDataURL={note.blurDataURL}
              sizes="(max-width: 1024px) 100vw, 672px"
              priority
              contained
              lightbox
            />
          </figure>
        )}

        <div>
          <div className="min-w-0">
            {note.isDraft && (
              <div className="mb-6 rounded-lg border border-border/50 bg-muted/50 px-4 py-3 text-muted-foreground text-sm">
                This is a draft — unfinished and subject to change.
              </div>
            )}

            {author ? (
              <Quote
                variant="feature"
                text={stripMarkdown(note.content)}
                author={{
                  name: author.name,
                  href: author.path,
                  avatar: author.avatar,
                  full:
                    author.avatar && author.portrait
                      ? {
                          src: author.avatar,
                          width: author.portrait.size[0],
                          height: author.portrait.size[1],
                        }
                      : null,
                }}
                source={note.source}
                date={noteDate(note)}
                tone={author.portrait?.tone}
                focus={author.portrait?.focus}
                ch={SERIF_CH}
              >
                {mdxContent}
              </Quote>
            ) : (
              <div className="prose prose-p:leading-[1.8] prose-p:my-6">
                {mdxContent}
              </div>
            )}

            {noteDate(note) && (
              <div className="mt-6 flex items-center gap-2 font-mono text-xs text-foreground-lowest uppercase tracking-wider">
                <time>{noteDate(note)}</time>
                <span className="text-muted-foreground">·</span>
                <ViewCounter slug={note.slug.join("/")} />
                <TrackView slug={note.slug.join("/")} />
              </div>
            )}

            {(note.verdict || note.deadline) && (
              <div className="mt-3 flex items-center gap-3 font-mono text-xs uppercase tracking-wider">
                {note.verdict && <VerdictInline verdict={note.verdict} />}
                {note.deadline && (
                  <span className="text-muted-foreground">
                    deadline: {note.deadline}
                  </span>
                )}
              </div>
            )}

            {backlinks.length > 0 && (
              <div className="mt-8 border-t border-border/50 pt-6">
                <h2 className="text-xs uppercase tracking-wide text-foreground-lowest mb-3">
                  Referenced in
                </h2>
                <ul className="space-y-2">
                  {backlinks.map((bl) => (
                    <li key={bl.path}>
                      <a
                        href={bl.path}
                        className="text-sm text-foreground-low hover:text-foreground"
                      >
                        {isPage(bl)
                          ? bl.title
                          : isFolder(bl)
                            ? bl.title
                            : bl.slug[bl.slug.length - 1]}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <Comments slug={note.slug.join("/")} />
      </div>

      {recs.length > 0 && (
        <RelatedSection>
          <Grid items={await prepareGridItems(recs)} />
        </RelatedSection>
      )}
    </article>
  );
}

// ============================================================================
// PAGE VIEW - full article with TOC
// ============================================================================

async function PageView({ page }: { page: Page }) {
  const mdxContent = await renderMDX(page.content, getMDXComponents());
  const recs = getRecommendations(page, 6);

  return (
    <article className="pb-16">
      <div className="mx-auto max-w-[90rem] px-6">
        {page.cover && (
          <figure className="mb-8 mx-auto max-w-2xl text-center">
            <CoverImage
              cover={page.cover}
              title={page.title}
              width={page.coverWidth}
              height={page.coverHeight}
              poster={page.poster}
              blurDataURL={page.blurDataURL}
              sizes="(max-width: 1024px) 100vw, 672px"
              priority
              contained
              lightbox
            />
          </figure>
        )}

        <div className="relative">
          <aside className="hidden xl:block absolute left-0 top-0 bottom-0">
            <TOC items={page.toc} />
          </aside>

          <div className="min-w-0 mx-auto max-w-2xl">
            <header>
              {page.isDraft && (
                <div className="mb-6 rounded-lg border border-border/50 bg-muted/50 px-4 py-3 text-muted-foreground text-sm">
                  This is a draft — unfinished and subject to change.
                </div>
              )}
              <h1 className="font-serif text-4xl font-normal tracking-tight leading-[1.15] sm:text-5xl">
                {page.title}
              </h1>
              {page.description && (
                <p className="mt-3 text-lg leading-relaxed text-foreground-low sm:text-xl sm:leading-relaxed">
                  {page.description}
                </p>
              )}
              {page.publishedAt && (
                <div className="mt-4 font-mono text-muted-foreground text-xs uppercase tracking-wider">
                  <time>{formatDate(page.publishedAt)}</time>
                  {page.updatedAt && (
                    <>
                      <span className="mx-2">·</span>
                      <PenLine
                        className="size-3.5 inline-block mr-1"
                        strokeWidth={1.5}
                      />
                      <time>{formatDate(page.updatedAt)}</time>
                    </>
                  )}
                  <span className="mx-2">·</span>
                  <ViewCounter slug={page.slug.join("/")} />
                  <TrackView slug={page.slug.join("/")} />
                </div>
              )}
              {(page.verdict || page.deadline) && (
                <div className="mt-3 flex items-center gap-3 font-mono text-xs uppercase tracking-wider">
                  {page.verdict && <VerdictInline verdict={page.verdict} />}
                  {page.deadline && (
                    <span className="text-muted-foreground">
                      deadline: {page.deadline}
                    </span>
                  )}
                </div>
              )}
            </header>

            <div className="mt-8 prose prose-p:leading-[1.8]">{mdxContent}</div>
          </div>
        </div>

        <div className="mx-auto max-w-2xl">
          <Comments slug={page.slug.join("/")} />
        </div>
      </div>

      {recs.length > 0 && (
        <RelatedSection>
          <Grid items={await prepareGridItems(recs)} />
        </RelatedSection>
      )}
    </article>
  );
}

// ============================================================================
// STATIC PARAMS & METADATA
// ============================================================================

export async function generateStaticParams() {
  const all = getAllContent();
  // Include empty slug for root
  return [{ slug: undefined }, ...all.map((c) => ({ slug: c.slug }))];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug = [] } = await params;

  if (slug.length === 0) return {};

  const content = getContentByPath(slug);
  if (!content) return {};

  const author = isNote(content) ? getAuthorForContent(content) : null;

  let title: string | undefined;
  let description: string | undefined;
  if (isNote(content)) {
    const clean = stripMarkdown(content.content);
    if (author) {
      title = `${author.name} quote`;
      description = clean.slice(0, 160);
    } else {
      title = "Adrian said";
      description = clean.slice(0, 160);
    }
  } else {
    title = (content as Page | Folder).title;
    description = (content as Page | Folder).description ?? undefined;
  }

  const slugStr = slug.join("/");
  // Every note has a card now, Adrian's own included; pages and folders need a cover.
  const hasOG =
    isNote(content) ||
    ((isPage(content) || isFolder(content)) && !!content.cover);

  const ogImage = hasOG
    ? { url: `/og/${slugStr}`, width: 1200, height: 630 }
    : null;

  return {
    title,
    description,
    openGraph: {
      title,
      description: description ?? undefined,
      siteName: "Adrian Galilea",
      ...(ogImage && { images: [ogImage] }),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage && { images: [ogImage.url] }),
    },
  };
}
