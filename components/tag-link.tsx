"use client";

import Link from "next/link";

type Props = {
  tag: string;
  className?: string;
};

export function TagLink({ tag, className = "text-accent-pop" }: Props) {
  return (
    <Link
      href={`/?tag=${encodeURIComponent(tag)}`}
      prefetch={true}
      className={`${className} hover:underline`}
      onClick={(e) => e.stopPropagation()}
    >
      {tag}
    </Link>
  );
}
