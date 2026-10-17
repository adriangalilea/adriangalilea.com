import { PenLine } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionView, prepareGridItems } from "@/components/collection-view";
import { Comments } from "@/components/comments";
import { CoverImage } from "@/components/cover-image";
import { Lanes } from "@/components/lanes";
import { Body, QUOTED } from "@/components/markdown";
import { RelatedSection } from "@/components/related-section";
import { TOC } from "@/components/toc";
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
  ogImagePath,
  type Page,
} from "@/lib/content";
import { SERIF_CH } from "@/lib/faces";
import { prepared } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";

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
                text={prepared(note.content).text}
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
                <Body source={note.content} className={QUOTED} />
              </Quote>
            ) : (
              <Body source={note.content} />
            )}

            {noteDate(note) && (
              <div className="mt-6 flex items-center gap-2 font-mono text-xs text-foreground-lowest uppercase tracking-wider">
                <time>{noteDate(note)}</time>
                <span className="text-muted-foreground">·</span>
                <ViewCounter slug={note.slug.join("/")} />
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
          <Lanes items={await prepareGridItems(recs)} />
        </RelatedSection>
      )}
    </article>
  );
}

// ============================================================================
// PAGE VIEW - full article with TOC
// ============================================================================

async function PageView({ page }: { page: Page }) {
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

            <Body source={page.content} className="mt-8" />
          </div>
        </div>

        <div className="mx-auto max-w-2xl">
          <Comments slug={page.slug.join("/")} />
        </div>
      </div>

      {recs.length > 0 && (
        <RelatedSection>
          <Lanes items={await prepareGridItems(recs)} />
        </RelatedSection>
      )}
    </article>
  );
}

// ============================================================================
// STATIC PARAMS & METADATA
// ============================================================================

// Every page is built from content at deploy: an address that was not built is
// no page, a 404 at once, never a render at request time (reading content then
// copies its media into public/, which a deployed function cannot write, and
// every unknown address answered 500).
export const dynamicParams = false;

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
    const clean = prepared(content.content).text;
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

  const ogPath = ogImagePath(content);
  const ogImage = ogPath ? { url: ogPath, width: 1200, height: 630 } : null;

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
