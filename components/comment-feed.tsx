"use client";

import { MessageSquare } from "lucide-react";
import Image from "next/image";
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

type FeedComment = {
  id: string;
  slug: string;
  userId: string;
  content: string;
  createdAt: string;
  userName: string;
  userImage: string | null;
};

type SlugComments = {
  comments: FeedComment[];
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

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const MAX_CHARS = 280;
const WARN_AT = 260;
const DANGER_AT = 280;

export function CharCounter({ length }: { length: number }) {
  const charsLeft = MAX_CHARS - length;
  const ratio = length / MAX_CHARS;
  const r = 8;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(ratio, 1));
  const overLimit = charsLeft < 0;

  if (length === 0) return null;

  const strokeColor =
    overLimit || length >= DANGER_AT
      ? "var(--color-destructive, #ef4444)"
      : length >= WARN_AT
        ? "#eab308"
        : "var(--color-muted-foreground, #888)";

  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        className="rotate-[-90deg]"
      >
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke="var(--color-border, #333)"
          strokeWidth="2"
        />
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-150"
        />
      </svg>
      {charsLeft <= 20 && (
        <span
          className="text-[10px] tabular-nums font-medium"
          style={{ color: strokeColor }}
        >
          {charsLeft}
        </span>
      )}
    </span>
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

  return (
    <div
      className="mt-3 border-t border-border/30 pt-3"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {commentsList.length > 0 && (
        <div className="space-y-2">
          {commentsList.map((c) => (
            <div key={c.id} className="flex gap-2 text-xs">
              {c.userImage && (
                <Image
                  src={c.userImage}
                  alt=""
                  width={18}
                  height={18}
                  className="rounded-full shrink-0 mt-0.5"
                  unoptimized
                />
              )}
              <div className="min-w-0">
                <span className="font-medium text-foreground-low">
                  {c.userName}
                </span>
                <span className="text-muted-foreground ml-1.5">
                  {timeAgo(c.createdAt)}
                </span>
                <p className="text-foreground text-[13px] mt-0.5 break-words">
                  {c.content}
                </p>
              </div>
            </div>
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

      {session ? (
        <form onSubmit={submit} className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reply directly..."
            className="flex-1 min-w-0 rounded-md border border-border/50 bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <CharCounter length={text.length} />
          <button
            type="submit"
            disabled={submitting || !text.trim() || overLimit}
            className="rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-40 shrink-0"
          >
            {submitting ? "..." : "Post"}
          </button>
        </form>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <MessageSquare className="size-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Sign in to comment
          </span>
          <div className="scale-75 origin-left">
            <SignInButtons />
          </div>
        </div>
      )}
    </div>
  );
}
