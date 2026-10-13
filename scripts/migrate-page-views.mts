// The old view counter's rows into the visits store, then gone. `page_views` held
// sha256(ip|ua) per page per day with no salt, kept for good: reversible from an IP,
// so personal data. Each row was one reader of one page on one day, which is what a
// day's `visits_views` count is (the visits that read the page), so the counts carry
// over as totals per page and day and the hashes are dropped with the table.
//
//   DATABASE_URL=… DATABASE_AUTH_TOKEN=… METRICS_DATABASE_URL=… VISITS_AUTH_TOKEN=… \
//     pnpm tsx scripts/migrate-page-views.mts
//
// Adds onto any count the sensor already kept that day. Once the table is dropped a
// second run finds nothing and stops.

import { createClient } from "@libsql/client";

const need = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`migrate: ${name} is not set`);
  return value;
};

const blog = createClient({
  url: need("DATABASE_URL"),
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const visits = createClient({
  url: need("METRICS_DATABASE_URL"),
  authToken: need("VISITS_AUTH_TOKEN"),
});

const exists = await blog.execute(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'page_views'",
);
if (exists.rows.length === 0) {
  console.log("page_views is gone already: nothing to carry over");
  process.exit(0);
}

const { rows } = await blog.execute(
  "SELECT slug, viewed_at AS day, COUNT(*) AS views FROM page_views GROUP BY slug, viewed_at",
);
const total = rows.reduce((n, r) => n + Number(r.views), 0);
for (const r of rows)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.day)))
    throw new Error(`migrate: ${r.slug} has no day: ${r.day}`);

await visits.batch(
  rows.map((r) => ({
    sql: "INSERT INTO visits_views (site, day, host, path, views) VALUES ('adriangalilea.com', ?, 'www.adriangalilea.com', ?, ?) ON CONFLICT (site, day, host, path) DO UPDATE SET views = views + excluded.views",
    args: [String(r.day), `/${String(r.slug)}`, Number(r.views)],
  })),
  "write",
);
const [kept] = (
  await visits.execute(
    "SELECT SUM(views) AS views FROM visits_views WHERE site = 'adriangalilea.com'",
  )
).rows;
if (Number(kept?.views) < total)
  throw new Error(
    `migrate: ${total} views read, ${kept?.views} kept: page_views stays`,
  );

await blog.execute("DROP TABLE page_views");
console.log(
  `carried ${total} views over ${rows.length} page-days into visits_views; page_views dropped`,
);
