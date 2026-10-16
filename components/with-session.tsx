"use client";

import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

export type Session = typeof authClient.$Infer.Session;

/** Who is signed in, for what renders it. Mounting this is what asks the server
 *  (better-auth's /get-session), so a part that has not mounted it has not asked:
 *  comments mount it once a reader is near them, not on every page load. Null while
 *  unknown and when signed out, which draw the same. */
export function WithSession({
  children,
}: {
  children: (session: Session | null) => ReactNode;
}) {
  const { data } = authClient.useSession();
  return children(data ?? null);
}
