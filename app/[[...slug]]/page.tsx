import { PenLine } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/card";
import { CollectionView } from "@/components/collection-view";
import { Comments } from "@/components/comments";
import { CoverImage } from "@/components/cover-image";
import { Grid } from "@/components/filterable-grid";
import { Quote } from "@/components/quote";
import { RelatedSection } from "@/components/related-section";
import { TagLink } from "@/components/tag-link";
import { TOC } from "@/components/toc";
import { TrackView } from "@/components/track-view";
import { ViewCounter } from "@/components/view-counter";
import {
  type Content,
  type Folder,
  getAllContent,
  getAuthorForContent,
  getBacklinks,
  getContentByPath,
  getFeaturedChildren,
  getRecommendations,
  isFolder,
  isNote,
  isPage,
  isPost,
  type Note,
  type Page,
  resolveOG,
} from "@/lib/content";
import { renderMDX, renderMDXString } from "@/lib/mdx";
import { getMDXComponents } from "@/mdx-components";

// Height calculation for grid distribution
function getCoverHeight(w: number | null, h: number | null): number {
  if (w && h) return 300 / (w / h);
  return 170;
}

function getItemHeight(c: Content): number {
  let h = 80;
  if (c.cover) h += getCoverHeight(c.coverWidth, c.coverHeight);
  if (isNote(c)) h += Math.min(c.content.length / 3, 100);
  else if (isPage(c) && c.description) h += 40;
  else if (isFolder(c) && !c.cover) {
    const pages = getFeaturedChildren(c.slug).filter(isPage) as Page[];
    if (pages.length > 0) {
      h += 80;
      if (pages[0].cover)
        h += getCoverHeight(pages[0].coverWidth, pages[0].coverHeight) * 0.7;
    }
  }
  return h;
}

async function prepareGridItems(items: Content[]) {
  return Promise.all(
    items.map(async (c) => ({
      path: c.path,
      tags: isPost(c) ? c.tags : [],
      height: getItemHeight(c),
      content: (
        <Card
          content={c}
          renderedNoteContent={
            isNote(c)
              ? (await renderMDXString(c.content, getMDXComponents()))
                  .mdxContent
              : undefined
          }
        />
      ),
    })),
  );
}

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
  const { mdxContent } = await renderMDX(note, getMDXComponents());
  const recs = getRecommendations(note, 6);
  const author = getAuthorForContent(note);
  const backlinks = getBacklinks(note);

  return (
    <article className="pb-16">
      <div className="mx-auto max-w-[90rem] px-6">
        {note.cover && (
          <figure className="pt-4 sm:pt-6 mb-8 max-w-2xl lg:ml-[248px]">
            <div className="w-full overflow-hidden rounded-2xl aspect-[16/9]">
              <CoverImage
                cover={note.cover}
                slug={note.slug.join("/")}
                title=""
                poster={note.poster}
                blurDataURL={note.blurDataURL}
                loop={note.coverLoop}
                sizes="(max-width: 1024px) 100vw, 672px"
                priority
              />
            </div>
          </figure>
        )}

        <div
          className={`${!note.cover ? "pt-4 sm:pt-6" : ""} lg:flex lg:gap-12`}
        >
          {/* Empty aside for alignment with PageView */}
          <aside className="hidden lg:block lg:w-[200px] lg:shrink-0" />

          <div className="min-w-0 max-w-2xl">
            {note.isDraft && (
              <div className="mb-6 rounded-lg border border-border/50 bg-muted/50 px-4 py-3 text-muted-foreground text-sm">
                This is a draft — unfinished and subject to change.
              </div>
            )}

            {note.tags.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs uppercase tracking-wide">
                {note.tags.map((tag, i) => (
                  <span key={tag}>
                    <TagLink tag={tag} />
                    {i < note.tags.length - 1 && (
                      <span className="text-muted-foreground">,</span>
                    )}
                  </span>
                ))}
              </div>
            )}

            {author ? (
              <Quote author={author} source={note.source} size="lg">
                {mdxContent}
              </Quote>
            ) : (
              <div className="prose prose-p:leading-[1.8]">{mdxContent}</div>
            )}

            {note.publishedAt && (
              <div className="mt-6 flex items-center gap-2 text-xs text-foreground-lowest tabular-nums">
                <time>
                  {new Date(note.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <span className="text-muted-foreground">·</span>
                <ViewCounter slug={note.slug.join("/")} />
                <TrackView slug={note.slug.join("/")} />
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

            <Comments slug={note.slug.join("/")} />
          </div>
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
// PAGE VIEW - full article with TOC
// ============================================================================

async function PageView({ page }: { page: Page }) {
  const { mdxContent } = await renderMDX(page, getMDXComponents());
  const recs = getRecommendations(page, 6);

  return (
    <article className="pb-16">
      <div className="mx-auto max-w-[90rem] px-6">
        {page.cover && (
          <figure className="pt-4 sm:pt-6 mb-8 max-w-2xl lg:ml-[248px]">
            <div className="w-full overflow-hidden rounded-2xl aspect-[16/9]">
              <CoverImage
                cover={page.cover}
                slug={page.slug.join("/")}
                title={page.title}
                poster={page.poster}
                blurDataURL={page.blurDataURL}
                loop={page.coverLoop}
                sizes="(max-width: 1024px) 100vw, 672px"
                priority
              />
            </div>
          </figure>
        )}

        <div
          className={`${!page.cover ? "pt-4 sm:pt-6" : ""} lg:flex lg:gap-12`}
        >
          <aside className="hidden lg:block lg:w-[200px] lg:shrink-0">
            <TOC items={page.toc} />
          </aside>

          <div className="min-w-0 max-w-2xl">
            <header>
              {page.isDraft && (
                <div className="mb-6 rounded-lg border border-border/50 bg-muted/50 px-4 py-3 text-muted-foreground text-sm">
                  This is a draft — unfinished and subject to change.
                </div>
              )}
              {page.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs uppercase tracking-wide">
                  {page.tags.map((tag, i) => (
                    <span key={tag}>
                      <TagLink tag={tag} />
                      {i < page.tags.length - 1 && (
                        <span className="text-muted-foreground">,</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {page.title}
              </h1>
              {page.description && (
                <p className="mt-3 text-lg leading-relaxed text-foreground-low sm:text-xl sm:leading-relaxed">
                  {page.description}
                </p>
              )}
              {page.publishedAt && (
                <div className="mt-4 text-muted-foreground text-xs tabular-nums">
                  <time>
                    {new Date(page.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  {page.updatedAt && (
                    <>
                      <span className="mx-2">·</span>
                      <PenLine
                        className="size-3.5 inline-block mr-1"
                        strokeWidth={1.5}
                      />
                      <time>
                        {new Date(page.updatedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    </>
                  )}
                  <span className="mx-2">·</span>
                  <ViewCounter slug={page.slug.join("/")} />
                  <TrackView slug={page.slug.join("/")} />
                </div>
              )}
            </header>

            <div className="mt-8 prose prose-p:leading-[1.8]">{mdxContent}</div>

            <Comments slug={page.slug.join("/")} />
          </div>
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

  // Root has default metadata from layout
  if (slug.length === 0) {
    return {};
  }

  const content = getContentByPath(slug);
  if (!content) return {};

  const title = isNote(content) ? undefined : (content as Page | Folder).title;
  const description = isNote(content)
    ? content.content.slice(0, 160)
    : ((content as Page | Folder).description ?? undefined);
  const ogUrl = resolveOG(content);

  return {
    title,
    description,
    openGraph: {
      title,
      description: description ?? undefined,
      ...(ogUrl && {
        images: [{ url: ogUrl, width: 1200, height: 630 }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogUrl && { images: [ogUrl] }),
    },
  };
}
