import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stripMarkdown(s: string): string {
  return s
    .replace(/[*_~`#>[\]()!]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}
