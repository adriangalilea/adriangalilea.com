"use client";

import { Folder } from "lucide-react";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { Link } from "@/components/link";

type Props = {
  folderPaths: string[];
};

export function NavbarBreadcrumb({ folderPaths }: Props) {
  const pathname = usePathname();
  const folderSet = new Set(folderPaths);

  // Build breadcrumb from folder segments only
  const segments = pathname.split("/").filter(Boolean);
  const folderSegments: { seg: string; href: string }[] = [];

  for (let i = 0; i < segments.length; i++) {
    const href = `/${segments.slice(0, i + 1).join("/")}`;
    if (folderSet.has(href)) {
      folderSegments.push({ seg: segments[i], href });
    }
  }

  // At root or no folders in path - show just the name
  if (folderSegments.length === 0) {
    return (
      <Link
        href="/"
        className="font-serif text-2xl sm:text-3xl tracking-tight transition-colors hover:text-foreground-low"
      >
        Adrian Galilea
      </Link>
    );
  }

  // Show folders only. Every crumb is a link, the last folder included: an article
  // inside it is the page, and the header names only the folders above it (ui's
  // Breadcrumb makes its last crumb the current page, never a link).
  return (
    <nav aria-label="breadcrumb">
      <ol className="flex flex-nowrap items-center gap-1 text-sm text-muted-foreground break-words sm:gap-2.5">
        <li className="inline-flex shrink-0 items-center gap-1.5">
          <Link
            href="/"
            className="font-serif text-xl tracking-tight text-foreground transition-colors hover:text-foreground-low sm:text-3xl"
          >
            <span className="sm:hidden">AG</span>
            <span className="hidden sm:inline">Adrian Galilea</span>
          </Link>
        </li>
        {folderSegments.map((item) => (
          <Fragment key={item.href}>
            <li
              role="presentation"
              aria-hidden="true"
              className="shrink-0 text-sm font-light text-foreground-lowest/50 sm:text-lg"
            >
              /
            </li>
            <li className="inline-flex min-w-0 items-center gap-1.5">
              <Link
                href={item.href}
                className="flex items-center gap-1.5 truncate font-mono text-sm transition-colors hover:text-foreground-low sm:text-base"
              >
                <Folder className="size-4 shrink-0 text-foreground-low sm:size-5" />
                {item.seg}
              </Link>
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
