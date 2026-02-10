"use client";

import Link from "next/link";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authClient } from "@/lib/auth-client";
import { SignInButtons } from "./auth-buttons";
import {
  CharCounter,
  CommentActions,
  CommentBody,
  type CommentData,
  MAX_CHARS,
} from "./comment-primitives";

export { CharCounter, MAX_CHARS };

type SlugComments = {
  comments: CommentData[];
  total: number;
};

const CommentsFeedContext = createContext<{
  data: Record<string, SlugComments>;
  refresh: () => void;
} | null>(null);

export function CommentsFeedProvider({
  slugs,
  children,
}: {
  slugs: string[];
  children: ReactNode;
}) {
  const [data, setData] = useState<Record<string, SlugComments>>({});
  const slugsKey = slugs.join(",");

  const refresh = useCallback(() => {
    if (!slugsKey) return;
    fetch(`/api/comments/batch?slugs=${encodeURIComponent(slugsKey)}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, [slugsKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <CommentsFeedContext value={{ data, refresh }}>
      {children}
    </CommentsFeedContext>
  );
}

export function FeedComments({ slug, path }: { slug: string; path: string }) {
  const ctx = useContext(CommentsFeedContext);
  const { data: session } = authClient.useSession();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const slugData = ctx?.data[slug];
  const commentsList = slugData?.comments ?? [];
  const total = slugData?.total ?? 0;
  const remaining = total - commentsList.length;
  const overLimit = text.length > MAX_CHARS;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!text.trim() || overLimit) return;
    setSubmitting(true);
    await fetch(`/api/comments/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setText("");
    setSubmitting(false);
    ctx?.refresh();
  }

  async function handleDelete(commentId: string) {
    await fetch(`/api/comments/${slug}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: commentId }),
    });
    ctx?.refresh();
  }

  return (
    <div
      className="mt-3 border-t border-border/30 pt-3"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {commentsList.length > 0 && (
        <div className="space-y-2">
          {commentsList.map((c) => (
            <CommentBody
              key={c.id}
              userName={c.userName}
              userImage={c.userImage}
              createdAt={c.createdAt}
              content={c.content}
              size="sm"
              actions={
                <CommentActions
                  onReply={() => {
                    window.location.href = path;
                  }}
                  canDelete={session?.user.id === c.userId}
                  onDelete={() => handleDelete(c.id)}
                />
              }
            />
          ))}
          {remaining > 0 && (
            <Link
              href={path}
              className="block text-xs text-muted-foreground hover:text-foreground-low"
            >
              {remaining} more {remaining === 1 ? "comment" : "comments"}
            </Link>
          )}
        </div>
      )}

      <form onSubmit={submit} className="mt-2 flex items-center gap-2">
        {session ? (
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reply directly..."
            className="flex-1 min-w-0 rounded-md border border-border/50 bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
        ) : (
          <div className="group/signin relative flex-1 min-w-0">
            <input
              type="text"
              disabled
              placeholder="Sign in to comment..."
              className="w-full rounded-md border border-border/50 bg-background px-2.5 py-1 text-xs opacity-50 cursor-not-allowed transition-opacity hidden sm:block group-hover/signin:opacity-0"
            />
            <div className="hidden sm:flex absolute inset-0 items-center justify-center opacity-0 transition-opacity group-hover/signin:opacity-100">
              <SignInButtons />
            </div>
            <div className="flex sm:hidden items-center gap-3">
              <span className="text-xs text-foreground-low shrink-0">
                Sign in to comment
              </span>
              <SignInButtons />
            </div>
          </div>
        )}
        {session && (
          <>
            <CharCounter length={text.length} />
            <button
              type="submit"
              disabled={submitting || !text.trim() || overLimit}
              className="rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {submitting ? "..." : "Post"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
