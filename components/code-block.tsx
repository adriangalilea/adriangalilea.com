"use client";

import { Check, Clipboard } from "lucide-react";
import { useCopy } from "@/components/ui/copy";

const LANG_NAMES: Record<string, string> = {
  js: "JavaScript",
  ts: "TypeScript",
  tsx: "TSX",
  jsx: "JSX",
  go: "Go",
  python: "Python",
  py: "Python",
  bash: "Shell",
  sh: "Shell",
  shell: "Shell",
  zsh: "Shell",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  css: "CSS",
  html: "HTML",
  diff: "Diff",
  cue: "CUE",
  sql: "SQL",
  rust: "Rust",
  md: "Markdown",
  mdx: "MDX",
};

function CopyButton({
  copied,
  onClick,
}: {
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground cursor-pointer select-none"
      aria-label="Copy code"
    >
      {copied ? (
        <>
          <Check size={14} />
          Copied!
        </>
      ) : (
        <>
          <Clipboard size={14} />
          Copy
        </>
      )}
    </button>
  );
}

/** A code block of a piece (components/markdown): Shiki's markup of it, coloured as
 *  the piece was prepared (lib/markdown), under its language and a copy button. */
export function CodeBlock({
  text,
  lang,
  html,
}: {
  text: string;
  lang: string;
  html: string | null;
}) {
  const { copied, copy } = useCopy(text);
  if (html === null)
    throw new Error(`a ${lang} code block reached the page uncoloured`);
  const label = lang !== "text" ? (LANG_NAMES[lang] ?? lang) : null;

  return (
    <div
      className="code-block group relative my-6 overflow-hidden rounded-xl"
      data-language={lang}
    >
      {label ? (
        <div className="code-header flex items-center justify-between px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground select-none">
            {label}
          </span>
          <CopyButton copied={copied} onClick={() => void copy()} />
        </div>
      ) : (
        <div className="absolute top-3 right-3 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <CopyButton copied={copied} onClick={() => void copy()} />
        </div>
      )}
      <div
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki's own escaped markup of the piece's code
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
