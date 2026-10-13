import { visitsRoute } from "@adriangalilea/utils/visits";
import { SITE, visitDriver } from "@/lib/visits";

// The site's pages (components/page-sensor), kept in visits by ts-utils' visits module
// (lib/visits). Pages read on a development host are the site's own: recorded,
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
