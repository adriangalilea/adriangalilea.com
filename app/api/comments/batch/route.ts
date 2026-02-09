import { and, inArray, isNull, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comments } from "@/lib/schema";

export async function GET(request: NextRequest) {
  const slugsParam = request.nextUrl.searchParams.get("slugs");
  if (!slugsParam) return NextResponse.json({});

  const slugs = slugsParam.split(",").filter(Boolean);
  if (slugs.length === 0) return NextResponse.json({});

  // Total root comments per slug
  const totals = await db
    .select({
      slug: comments.slug,
      total: sql<number>`count(*)`,
    })
    .from(comments)
    .where(and(inArray(comments.slug, slugs), isNull(comments.parentId)))
    .groupBy(comments.slug);

  const totalMap: Record<string, number> = {};
  for (const row of totals) totalMap[row.slug] = row.total;

  // 2 most recent root comments per slug, with user info
  // Use a subquery with row_number to pick top 2 per slug
  const rows = await db.all<{
    id: string;
    slug: string;
    user_id: string;
    content: string;
    created_at: number;
    user_name: string;
    user_image: string | null;
  }>(sql`
    select c.id, c.slug, c.user_id, c.content, c.created_at, u.name as user_name, u.image as user_image
    from (
      select *, row_number() over (partition by slug order by created_at desc) as rn
      from comments
      where parent_id is null and slug in (${sql.join(
        slugs.map((s) => sql`${s}`),
        sql`, `,
      )})
    ) c
    inner join user u on c.user_id = u.id
    where c.rn <= 2
    order by c.created_at asc
  `);

  const result: Record<
    string,
    {
      comments: {
        id: string;
        slug: string;
        userId: string;
        content: string;
        createdAt: string;
        userName: string;
        userImage: string | null;
      }[];
      total: number;
    }
  > = {};

  for (const slug of slugs) {
    result[slug] = { comments: [], total: totalMap[slug] ?? 0 };
  }

  for (const row of rows) {
    result[row.slug]?.comments.push({
      id: row.id,
      slug: row.slug,
      userId: row.user_id,
      content: row.content,
      createdAt: new Date(row.created_at * 1000).toISOString(),
      userName: row.user_name,
      userImage: row.user_image,
    });
  }

  return NextResponse.json(result);
}
