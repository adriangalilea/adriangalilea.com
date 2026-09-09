import type { NextRequest } from "next/server";

/** One visitor per (ip, user agent) per day, hashed so no address is stored. */
export async function visitorOf(request: NextRequest): Promise<string> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = request.headers.get("user-agent") ?? "unknown";
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${ip}|${ua}`),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
