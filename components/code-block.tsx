"use client";

import { Check, Clipboard } from "lucide-react";
import { type ComponentProps, useRef } from "react";
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

export function Pre({ children, style, ...props }: ComponentProps<"pre">) {
  const ref = useRef<HTMLPreElement>(null);
  const { copied, copy } = useCopy(
    () => ref.current?.querySelector("code")?.textContent ?? "",
  );

  const lang = (props as Record<string, unknown>)["data-language"] as
    | string
    | undefined;
  const label = lang && lang !== "text" ? (LANG_NAMES[lang] ?? lang) : null;

  // Forward shiki bg variables to wrapper so the header can use them
  const bgVars = style as Record<string, string> | undefined;
  const wrapperStyle = {
    "--shiki-light-bg": bgVars?.["--shiki-light-bg"],
    "--shiki-dark-bg": bgVars?.["--shiki-dark-bg"],
  } as React.CSSProperties;

  return (
    <div
      className="code-block not-prose group relative my-6 overflow-hidden rounded-xl"
      data-language={lang}
      style={wrapperStyle}
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
      <pre ref={ref} style={style} {...props}>
        {children}
      </pre>
    </div>
  );
}
