"use client";

import { PageSensor } from "@/components/ui/page-sensor";

// The site's pages in the event stream (ui page-sensor), posted to app/api/events. A
// PLACE is what a reader would call where they are: the home, else the note or
// collection the path opens with (`/telos/...` is telos). The registry beside it
// (ui.adriangalilea.com) is the place "ui".

const placeOf = (path: string) => path.split("/")[1] || "home";

export function SitePageSensor({ build }: { build?: string }) {
  return (
    <PageSensor
      service="blog-web"
      collector="/api/events"
      build={build}
      place={placeOf}
      route={(path) => path}
    />
  );
}
