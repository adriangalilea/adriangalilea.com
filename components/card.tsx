import {
  FileText,
  Folder as FolderIcon,
  PenLine,
  StickyNote,
} from "lucide-react";
import type { ReactNode } from "react";
import { ClickableWrapper } from "@/components/clickable-wrapper";
import { CoverImage } from "@/components/cover-image";
import { Quote } from "@/components/quote";
import { STATUS_CONFIG, StatusBadge } from "@/components/status-badge";
import { FeedViewCount } from "@/components/view-counter";
import type { Content, Folder, Note, Page } from "@/lib/content";
import {
  getAuthorForContent,
  getFeaturedChildren,
  isFolder,
  isNote,
  isPage,
} from "@/lib/content";
import { cn } from "@/lib/utils";

// ============================================================================
// STYLES
// ============================================================================

function CardShine() {
  return <div className="glass-card-shine" />;
}

const cardBase = "rounded-xl glass-card overflow-hidden";
const cardHover = "hover:scale-[1.02] hover:-translate-y-1";
const feedFlat = "glass-card-feed-flat";
const cardDraft = "opacity-50 grayscale-[30%]";

const statusHoverClasses: Record<string, string> = {
  violet: "hover:bg-violet-500/5 max-sm:bg-violet-500/5",
  rose: "hover:bg-rose-500/5 max-sm:bg-rose-500/5",
  cyan: "hover:bg-cyan-500/5 max-sm:bg-cyan-500/5",
  yellow: "hover:bg-yellow-500/5 max-sm:bg-yellow-500/5",
};

// ============================================================================
// NOTE CARD
// ============================================================================

function NoteCard({
  note,
  renderedContent,
}: {
  note: Note;
  renderedContent?: ReactNode;
}) {
  const author = getAuthorForContent(note);
  const body = renderedContent ? (
    renderedContent
  ) : (
    <p className="text-sm leading-relaxed">{note.content.trim()}</p>
  );

  return (
    <ClickableWrapper
      href={note.path}
      className={cn(
        "group cursor-pointer",
        cardBase,
        cardHover,
        feedFlat,
        note.isDraft && cardDraft,
      )}
    >
      {note.cover && (
        <CoverImage
          cover={note.cover}
          slug={note.slug.join("/")}
          title=""
          width={note.coverWidth}
          height={note.coverHeight}
          poster={note.poster}
          blurDataURL={note.blurDataURL}
          loop={note.coverLoop}
          intrinsic
          hoverPlay
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
        />
      )}
      <div className="p-4">
        {author ? (
          <>
            <Quote author={author} publishedAt={note.publishedAt} size="sm">
              {body}
            </Quote>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-foreground-lowest">
              <FeedViewCount slug={note.slug.join("/")} />
            </div>
          </>
        ) : (
          <>
            <div className="prose prose-sm max-w-none prose-p:my-0 prose-p:leading-relaxed">
              {body}
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-foreground-lowest">
              {note.publishedAt && (
                <>
                  <StickyNote className="size-3" />
                  <time>
                    {new Date(note.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                  <span>·</span>
                </>
              )}
              <FeedViewCount slug={note.slug.join("/")} />
            </div>
          </>
        )}
      </div>
      <CardShine />
    </ClickableWrapper>
  );
}

// ============================================================================
// PAGE CARD
// ============================================================================

function PageCard({ page }: { page: Page }) {
  return (
    <ClickableWrapper
      href={page.path}
      className={cn(
        "group relative cursor-pointer",
        cardBase,
        cardHover,
        feedFlat,
        page.isDraft && cardDraft,
      )}
    >
      {page.cover && (
        <CoverImage
          cover={page.cover}
          slug={page.slug.join("/")}
          title={page.title}
          width={page.coverWidth}
          height={page.coverHeight}
          poster={page.poster}
          blurDataURL={page.blurDataURL}
          loop={page.coverLoop}
          intrinsic
          hoverPlay
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
        />
      )}
      <div className="p-4">
        <h3 className="text-xl font-semibold leading-tight tracking-tight">
          {page.title}
        </h3>
        {page.description && (
          <p className="text-sm text-foreground-low mt-1">{page.description}</p>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
          {page.publishedAt && (
            <>
              <FileText className="size-3" />
              <time>
                {new Date(page.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
              {page.updatedAt &&
                new Date(page.updatedAt) > new Date(page.publishedAt) && (
                  <>
                    <span className="text-foreground-lowest">·</span>
                    <PenLine className="size-3" />
                    <time>
                      {new Date(page.updatedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </>
                )}
              <span className="text-foreground-lowest">·</span>
            </>
          )}
          <FeedViewCount slug={page.slug.join("/")} />
        </div>
      </div>
      <span className="absolute bottom-3 right-3 text-foreground-lowest transition-transform group-hover:translate-x-0.5">
        &rarr;
      </span>
      <CardShine />
    </ClickableWrapper>
  );
}

// ============================================================================
// FOLDER CARD
// ============================================================================

function FolderCard({ folder }: { folder: Folder }) {
  const colorKey = folder.status ? STATUS_CONFIG[folder.status].colorKey : null;

  return (
    <ClickableWrapper
      href={folder.path}
      className={cn(
        "group relative cursor-pointer",
        cardBase,
        cardHover,
        feedFlat,
        colorKey && statusHoverClasses[colorKey],
      )}
    >
      {folder.status && <StatusBadge status={folder.status} absolute />}
      {folder.cover && (
        <CoverImage
          cover={folder.cover}
          slug={folder.slug.join("/")}
          title={folder.title}
          width={folder.coverWidth}
          height={folder.coverHeight}
          poster={folder.poster}
          blurDataURL={folder.blurDataURL}
          loop={folder.coverLoop}
          intrinsic
          hoverPlay
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
        />
      )}
      <div className="p-4">
        <div className="flex items-center gap-1.5">
          <FolderIcon className="size-4 text-foreground-lowest" />
          <span className="font-semibold">{folder.title}</span>
        </div>
        {folder.description && (
          <p className="text-sm text-foreground-low mt-1">
            {folder.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-foreground-lowest">
          <FeedViewCount slug={folder.slug.join("/")} />
        </div>
      </div>
      <CardShine />
    </ClickableWrapper>
  );
}

// ============================================================================
// X-RAY FOLDER CARD - shows preview of internal posts
// ============================================================================

function XrayFolderCard({ folder }: { folder: Folder }) {
  const colorKey = folder.status ? STATUS_CONFIG[folder.status].colorKey : null;
  const featured = getFeaturedChildren(folder.slug).filter((c) => !isFolder(c));
  const toShow = featured.slice(0, 1);
  const remaining = featured.length - 1;

  return (
    <div
      className={cn(
        "group/folder relative cursor-pointer",
        cardBase,
        cardHover,
        feedFlat,
        colorKey && statusHoverClasses[colorKey],
      )}
    >
      {folder.status && <StatusBadge status={folder.status} absolute />}
      <ClickableWrapper href={folder.path} className="block p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <FolderIcon className="size-4 text-foreground-lowest" />
              <span className="font-semibold">{folder.title}</span>
            </div>
            {folder.description && (
              <p className="text-sm text-foreground-low mt-1">
                {folder.description}
              </p>
            )}
          </div>
        </div>
      </ClickableWrapper>

      {toShow.length > 0 && (
        <div className="px-4 pb-4">
          {toShow.map((item) => (
            <Card key={item.path} content={item} />
          ))}
          {remaining > 0 && (
            <ClickableWrapper
              href={folder.path}
              className="mt-2 block text-xs text-foreground-lowest hover:text-foreground-low"
            >
              + {remaining} more
            </ClickableWrapper>
          )}
        </div>
      )}
      <CardShine />
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function shouldShowXray(content: Content): boolean {
  if (!isFolder(content)) return false;
  if (content.cover) return false;
  const children = getFeaturedChildren(content.slug);
  return children.some((c) => !isFolder(c));
}

// ============================================================================
// MAIN EXPORT - Card({ content })
// ============================================================================

type CardProps = {
  content: Content;
  renderedNoteContent?: ReactNode;
};

export function Card({ content, renderedNoteContent }: CardProps) {
  if (isNote(content)) {
    return <NoteCard note={content} renderedContent={renderedNoteContent} />;
  }

  if (isPage(content)) {
    return <PageCard page={content} />;
  }

  if (isFolder(content)) {
    return shouldShowXray(content) ? (
      <XrayFolderCard folder={content} />
    ) : (
      <FolderCard folder={content} />
    );
  }

  const _exhaustive: never = content;
  return null;
}
