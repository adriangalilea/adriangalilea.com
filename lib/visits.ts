import "server-only";
import { libsqlDriver } from "@adriangalilea/utils/metrics/libsql";
import { createClient } from "@libsql/client";

// The site's visits, kept by ts-utils' visits module in the shared Turso `metrics`
// database (the `visits_*` tables, provisioned once with the Turso CLI, never on a
// request), apart from this site's own database. ui.adriangalilea.com writes the same
// tables as the same site, so a visit from one to the other is one visit. The token
// is scoped to the visits tables (read, add, update, delete: the route prunes old
// rows). A page's view count is read from the same store (`readViews`): per day and
// page, how many visits read it, with nothing of who.

export const SITE = "adriangalilea.com";
export const HOST = "adriangalilea.com";

let driver: ReturnType<typeof libsqlDriver> | undefined;
export function visitDriver() {
  const url = process.env.METRICS_DATABASE_URL;
  const authToken = process.env.VISITS_AUTH_TOKEN;
  if (!url || !authToken)
    throw new Error(
      "visits: METRICS_DATABASE_URL and VISITS_AUTH_TOKEN are not set",
    );
  driver ??= libsqlDriver(createClient({ url, authToken }));
  return driver;
}

/** A note's page: where its views are counted. */
export const pathOf = (slug: string) => `/${slug}`;
