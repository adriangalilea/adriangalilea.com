import { type NextRequest, NextResponse } from "next/server";
import { HOST, pathOf, SITE, visitDriver } from "@/lib/visit-store";
import { readViews } from "@/lib/visits";

// Many notes' view counts at once, for a feed (components/view-counter): how many
// visits opened each note's page, all time (lib/visits). Counting is the page
// sensor's; this only reads.

export async function GET(request: NextRequest) {
  const slugs = (request.nextUrl.searchParams.get("slugs") ?? "")
    .split(",")
    .filter(Boolean);
  if (slugs.length === 0) return NextResponse.json({ counts: {} });
  const views = await readViews(visitDriver(), {
    site: SITE,
    host: HOST,
    paths: slugs.map(pathOf),
  });
  const counts: Record<string, number> = {};
  for (const slug of slugs) {
    const n = views[pathOf(slug)];
    if (n !== undefined) counts[slug] = n;
  }
  return NextResponse.json({ counts });
}
