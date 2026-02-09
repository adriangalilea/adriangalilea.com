import { ExternalLink } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { Lightbox } from "@/components/lightbox";
import type { AuthorInfo } from "@/lib/content";
import { cn } from "@/lib/utils";

type QuoteProps = {
  author: AuthorInfo;
  children: ReactNode;
  source?: string | null;
  publishedAt?: Date | null;
  size?: "sm" | "lg";
};

export function Quote({
  author,
  children,
  source,
  publishedAt,
  size = "sm",
}: QuoteProps) {
  const isLarge = size === "lg";

  return (
    <blockquote
      className={cn(
        "border-l-2 border-foreground-lowest/30",
        isLarge ? "pl-6" : "pl-4",
      )}
    >
      <div
        className={cn(
          "italic",
          isLarge
            ? "prose prose-p:leading-[1.8] prose-lg"
            : "prose prose-sm max-w-none prose-p:my-0 prose-p:leading-relaxed",
        )}
      >
        {children}
      </div>
      <a
        href={author.path}
        className={cn(
          "flex items-center hover:opacity-80 not-italic",
          isLarge ? "mt-6 gap-3" : "mt-3 gap-2",
        )}
      >
        {author.avatar &&
          (isLarge ? (
            <Lightbox src={author.avatar} alt={author.name}>
              <Image
                src={author.avatar}
                alt=""
                width={48}
                height={48}
                className="size-12 rounded-full"
              />
            </Lightbox>
          ) : (
            <Image
              src={author.avatar}
              alt=""
              width={24}
              height={24}
              className="size-6 rounded-full"
            />
          ))}
        <span
          className={cn(
            "text-foreground-lowest",
            isLarge ? "text-base font-medium" : "text-xs",
          )}
        >
          {author.name}
        </span>
      </a>
      {source && isLarge && (
        <a
          href={source}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-foreground-lowest hover:text-foreground-low not-italic"
        >
          <ExternalLink className="size-3" />
          <span>Source</span>
        </a>
      )}
      {publishedAt && (
        <time
          className={cn(
            "block text-xs text-foreground-lowest not-italic",
            isLarge ? "mt-3" : "mt-2",
          )}
        >
          {new Date(publishedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </time>
      )}
    </blockquote>
  );
}
