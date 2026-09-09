import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** The one date format the site shows: `Sep 9, 2026`. */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function stripMarkdown(s: string): string {
  return s
    .replace(/[*_~`#>[\]()!]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}
