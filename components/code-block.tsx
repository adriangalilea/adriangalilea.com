"use client";

import { Check, Clipboard } from "lucide-react";
import { type ComponentProps, useRef, useState } from "react";

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
  const [copied, setCopied] = useState(false);

  const lang = (props as Record<string, unknown>)["data-language"] as
    | string
    | undefined;
  const label = lang && lang !== "text" ? (LANG_NAMES[lang] ?? lang) : null;

  function copy() {
    const code = ref.current?.querySelector("code");
    if (!code) return;
    navigator.clipboard.writeText(code.textContent ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Forward shiki bg variables to wrapper so the header can use them
  const bgVars = style as Record<string, string> | undefined;
  const wrapperStyle = {
    "--shiki-light-bg": bgVars?.["--shiki-light-bg"],
    "--shiki-dark-bg": bgVars?.["--shiki-dark-bg"],
  } as React.CSSProperties;

  return (
    <div
      className="code-block not-prose group relative my-6 overflow-hidden rounded-xl border border-border"
      data-language={lang}
      style={wrapperStyle}
    >
      {label ? (
        <div className="code-header flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground select-none">
            {label}
          </span>
          <CopyButton copied={copied} onClick={copy} />
        </div>
      ) : (
        <div className="absolute top-3 right-3 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <CopyButton copied={copied} onClick={copy} />
        </div>
      )}
      <pre ref={ref} style={style} {...props}>
        {children}
      </pre>
    </div>
  );
}
