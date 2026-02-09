"use client";

import { MessageSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { SignInButtons, SignOutButton } from "./auth-buttons";
import {
  CharCounter,
  CommentActions,
  CommentBody,
  type CommentData,
  MAX_CHARS,
  UserAvatar,
} from "./comment-primitives";

type TreeNode = CommentData & { children: TreeNode[] };

function buildTree(flat: CommentData[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  for (const c of flat) map.set(c.id, { ...c, children: [] });
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function CommentNode({
  node,
  slug,
  userId,
  depth,
  onRefresh,
}: {
  node: TreeNode;
  slug: string;
  userId: string | null;
  depth: number;
  onRefresh: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isOwn = userId === node.userId;

  const replyOverLimit = replyText.length > MAX_CHARS;

  async function submitReply() {
    if (!replyText.trim() || replyOverLimit) return;
    setSubmitting(true);
    await fetch(`/api/comments/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyText, parentId: node.id }),
    });
    setReplyText("");
    setReplying(false);
    setSubmitting(false);
    onRefresh();
  }

  async function handleDelete() {
    await fetch(`/api/comments/${slug}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: node.id }),
    });
    onRefresh();
  }

  return (
    <div className={depth > 0 ? "ml-6 border-l border-border/50 pl-4" : ""}>
      <div className="py-3">
        <CommentBody
          userName={node.userName}
          userImage={node.userImage}
          createdAt={node.createdAt}
          content={node.content}
          size="md"
          actions={
            <CommentActions
              canReply={!!userId}
              onReply={() => setReplying(!replying)}
              canDelete={isOwn}
              onDelete={handleDelete}
            />
          }
        />
        {replying && (
          <div className="mt-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              rows={2}
            />
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={submitReply}
                disabled={submitting || !replyText.trim() || replyOverLimit}
                className="rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                {submitting ? "..." : "Reply"}
              </button>
              <button
                type="button"
                onClick={() => setReplying(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <div className="ml-auto">
                <CharCounter length={replyText.length} />
              </div>
            </div>
          </div>
        )}
      </div>
      {node.children.map((child) => (
        <CommentNode
          key={child.id}
          node={child}
          slug={slug}
          userId={userId}
          depth={depth + 1}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

export function Comments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { data: session } = authClient.useSession();

  const fetchComments = useCallback(() => {
    fetch(`/api/comments/${slug}`)
      .then((r) => r.json())
      .then(setComments)
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const overLimit = text.length > MAX_CHARS;

  async function submitComment() {
    if (!text.trim() || overLimit) return;
    setSubmitting(true);
    await fetch(`/api/comments/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setText("");
    setSubmitting(false);
    fetchComments();
  }

  const tree = buildTree(comments);

  return (
    <section className="mt-12 border-t border-border/50 pt-8">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare size={16} strokeWidth={1.5} />
        Comments{comments.length > 0 && ` (${comments.length})`}
      </h2>

      {session ? (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {session.user.image && (
                <UserAvatar src={session.user.image} size="md" />
              )}
              <span>{session.user.name}</span>
            </div>
            <SignOutButton />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            rows={3}
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={submitComment}
              disabled={submitting || !text.trim() || overLimit}
              className="rounded-md bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {submitting ? "Posting..." : "Post"}
            </button>
            <CharCounter length={text.length} />
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Sign in to leave a comment.
          </p>
          <SignInButtons />
        </div>
      )}

      {tree.length > 0 && (
        <div className="mt-6">
          {tree.map((node) => (
            <CommentNode
              key={node.id}
              node={node}
              slug={slug}
              userId={session?.user.id ?? null}
              depth={0}
              onRefresh={fetchComments}
            />
          ))}
        </div>
      )}
    </section>
  );
}
