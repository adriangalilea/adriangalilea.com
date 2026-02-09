import { eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pageViews } from "@/lib/schema";

function hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest("SHA-256", encoder.encode(input)).then((buf) => {
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const slugStr = slug.join("/");
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = request.headers.get("user-agent") ?? "unknown";
  const visitor = await hash(`${ip}|${ua}`);
  const viewedAt = new Date().toISOString().slice(0, 10);

  // insert-or-ignore: unique constraint handles dedup
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
