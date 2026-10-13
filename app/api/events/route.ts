import { SITE, visitDriver } from "@/lib/visit-store";
import { visitsRoute } from "@/lib/visits";

// The site's pages (components/page-sensor), kept in visits by the ui registry's visits
// (lib/visits, stored as lib/visit-store says). Pages read on a development host are the site's own: recorded,
// flagged, never counted. Built on the first batch: a build reads no credentials.

let route: ((request: Request) => Promise<Response>) | undefined;

export function POST(request: Request) {
  route ??= visitsRoute({
    db: visitDriver(),
    site: SITE,
    services: ["blog-web"],
    staff: (r) => {
      const host = (r.headers.get("host") ?? "").split(":")[0] ?? "";
      return host === "localhost" || host.endsWith(".localhost");
    },
  });
  return route(request);
}
