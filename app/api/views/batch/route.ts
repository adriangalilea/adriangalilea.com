import { inArray, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pageViews } from "@/lib/schema";
import { today, visitorOf } from "@/lib/visitor";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const slugs: string[] = body.slugs ?? [];

  if (slugs.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const visitor = await visitorOf(request);
  const viewedAt = today();

  await db
    .insert(pageViews)
    .values(slugs.map((slug) => ({ slug, visitor, viewedAt })))
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const slugsParam = request.nextUrl.searchParams.get("slugs");
  if (!slugsParam) return NextResponse.json({ counts: {} });

  const slugs = slugsParam.split(",").filter(Boolean);
  if (slugs.length === 0) return NextResponse.json({ counts: {} });

  const rows = await db
    .select({
      slug: pageViews.slug,
      count: sql<number>`count(distinct ${pageViews.visitor})`,
    })
    .from(pageViews)
    .where(inArray(pageViews.slug, slugs))
    .groupBy(pageViews.slug);

  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.slug] = row.count;
  return NextResponse.json({ counts });
}
