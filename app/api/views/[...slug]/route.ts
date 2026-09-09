import { eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pageViews } from "@/lib/schema";
import { today, visitorOf } from "@/lib/visitor";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const slugStr = slug.join("/");
  const visitor = await visitorOf(request);
  const viewedAt = today();

  await db
    .insert(pageViews)
    .values({ slug: slugStr, visitor, viewedAt })
    .onConflictDoNothing();

  const [row] = await db
    .select({ count: sql<number>`count(distinct ${pageViews.visitor})` })
    .from(pageViews)
    .where(eq(pageViews.slug, slugStr));

  return NextResponse.json({ views: row?.count ?? 0 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const slugStr = slug.join("/");

  const [row] = await db
    .select({ count: sql<number>`count(distinct ${pageViews.visitor})` })
    .from(pageViews)
    .where(eq(pageViews.slug, slugStr));

  return NextResponse.json({ views: row?.count ?? 0 });
}
