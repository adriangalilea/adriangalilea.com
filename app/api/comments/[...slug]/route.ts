import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comments, user } from "@/lib/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const slugStr = slug.join("/");

  const rows = await db
    .select({
      id: comments.id,
      slug: comments.slug,
      userId: comments.userId,
      parentId: comments.parentId,
      content: comments.content,
      createdAt: comments.createdAt,
      userName: user.name,
      userImage: user.image,
    })
    .from(comments)
    .innerJoin(user, eq(comments.userId, user.id))
    .where(eq(comments.slug, slugStr))
    .orderBy(comments.createdAt);

  return NextResponse.json(rows);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const slugStr = slug.join("/");
  const body = await request.json();
  const content = (body.content as string)?.trim();
  if (!content || content.length === 0) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: "Too long" }, { status: 400 });
  }

  const id = nanoid();
  const now = new Date();

  await db.insert(comments).values({
    id,
    slug: slugStr,
    userId: session.user.id,
    parentId: body.parentId ?? null,
    content,
    createdAt: now,
  });

  return NextResponse.json({ id, createdAt: now });
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const commentId = body.id as string;
  if (!commentId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Verify ownership
  const [existing] = await db
    .select({ userId: comments.userId })
    .from(comments)
    .where(eq(comments.id, commentId));

  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if has children — soft delete if so
  const [childCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(eq(comments.parentId, commentId));

  if (childCount && childCount.count > 0) {
    await db
      .update(comments)
      .set({ content: "[deleted]" })
      .where(eq(comments.id, commentId));
  } else {
    await db.delete(comments).where(eq(comments.id, commentId));
  }

  return NextResponse.json({ ok: true });
}
