import { eq, sql } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { db } from "@/lib/db";
import { pageViews } from "@/lib/schema";

export async function ViewCounter({ slug }: { slug: string }) {
  "use cache";
  cacheLife("minutes");

  const [row] = await db
    .select({ count: sql<number>`count(distinct ${pageViews.visitor})` })
    .from(pageViews)
    .where(eq(pageViews.slug, slug));

  const views = row?.count ?? 0;

  return (
    <span className="text-muted-foreground">
      {views.toLocaleString()} {views === 1 ? "view" : "views"}
    </span>
  );
}
