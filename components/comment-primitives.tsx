import Image from "next/image";
import type { ReactNode } from "react";

export type CommentData = {
  id: string;
  slug: string;
  userId: string;
  parentId?: string | null;
  content: string;
  createdAt: string;
  userName: string;
  userImage: string | null;
};

export function timeAgo(date: string): string {
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

const AVATAR_SIZE = { sm: 18, md: 20 } as const;

export function UserAvatar({
  src,
  size = "md",
}: {
  src: string;
  size?: "sm" | "md";
}) {
  const px = AVATAR_SIZE[size];
  return (
    <Image
      src={src}
      alt=""
      width={px}
      height={px}
      className={`rounded-full shrink-0 object-cover ${size === "sm" ? "size-[18px]" : "size-5"}`}
      unoptimized
    />
  );
}

export function CommentActions({
  onReply,
  onDelete,
  canDelete,
}: {
  onReply: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}) {
  return (
    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={onReply}
        className="hover:text-foreground transition-colors"
      >
        reply
      </button>
      {canDelete && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="hover:text-destructive transition-colors"
        >
          delete
        </button>
      )}
    </div>
  );
}

export function CommentBody({
  userName,
  userImage,
  createdAt,
  content,
  size = "md",
  actions,
}: {
  userName: string;
  userImage: string | null;
  createdAt: string;
  content: string;
  size?: "sm" | "md";
  actions?: ReactNode;
}) {
  const isDeleted = content === "[deleted]";
  const isSm = size === "sm";

  return (
    <div className={`flex gap-2 ${isSm ? "text-xs" : ""}`}>
      {userImage && <UserAvatar src={userImage} size={size} />}
      <div className="min-w-0">
        <div
          className={`flex items-center gap-1.5 ${isSm ? "" : "text-xs text-muted-foreground"}`}
        >
          <span className="font-medium text-foreground-low">{userName}</span>
          <span className={isSm ? "text-muted-foreground" : ""}>
            {timeAgo(createdAt)}
          </span>
        </div>
        {isDeleted ? (
          <span
            className={`italic text-muted-foreground ${isSm ? "text-[13px] mt-0.5" : "text-sm mt-1"} block`}
          >
            [deleted]
          </span>
        ) : (
          <p
            className={`text-foreground break-words ${isSm ? "text-[13px] mt-0.5" : "text-sm mt-1"}`}
          >
            {content}
          </p>
        )}
        {!isDeleted && actions}
      </div>
    </div>
  );
}

export const MAX_CHARS = 280;
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
