import { type NextRequest, NextResponse } from "next/server";
import { HOST, pathOf, SITE, visitDriver } from "@/lib/visit-store";
import { readViews } from "@/lib/visits";

// One note's view count (components/view-counter): how many visits opened its page,
// all time (lib/visits). Counting is the page sensor's; this only reads.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const path = pathOf((await params).slug.join("/"));
  const views = await readViews(visitDriver(), {
    site: SITE,
    host: HOST,
    paths: [path],
  });
  return NextResponse.json({ views: views[path] ?? 0 });
}
