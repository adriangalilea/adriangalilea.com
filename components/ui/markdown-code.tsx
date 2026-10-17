"use client";

// A CODE BLOCK, HIGHLIGHTED IN THE BROWSER: the one part of markdown that needs the
// browser (Shiki loads there, only once a block shows), so the page around it renders
// anywhere, a server included. Plain at once, coloured once Shiki has loaded, in code's
// frame with code's two themes.

import * as React from "react";
import { CODE_THEMES } from "@/lib/code-tokens";
import { cn } from "@/lib/utils";
import "./code.css";
import "./edge-fade";

/** Code highlighted in the browser, with code's two themes and its frame; or drawn
 *  from the markup it was coloured with ahead (`html`, markdown-prepare), and then
 *  no highlighter loads at all. */
export function Highlighted({
  text,
  lang,
  html: ahead = null,
  className,
}: {
  text: string;
  lang: string;
  html?: string | null;
  className?: string;
}) {
  const [html, setHtml] = React.useState<string | null>(ahead);
  React.useEffect(() => {
    if (ahead !== null || lang === "text") return;
    let live = true;
    void import("shiki").then(async ({ bundledLanguages, codeToHtml }) => {
      if (!(lang in bundledLanguages)) return;
      const out = await codeToHtml(text, {
        lang,
        themes: CODE_THEMES,
        defaultColor: false,
      });
      if (live) setHtml(out);
    });
    return () => {
      live = false;
    };
  }, [text, lang, ahead]);
  return (
    <div
      data-slot="markdown-code"
      data-language={lang}
      className={cn("ag-code", className)}
    >
      {/* The code's own scroller, both ways, its cut edges fading (code.css,
          scrims' `ag-edge-fade-xy`), the frame staying whole. */}
      {html ? (
        <div
          className="ag-code-scroll ag-edge-fade-xy"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki's own escaped markup of the text
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="ag-code-scroll ag-edge-fade-xy">
          <pre>
            <code>{text}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
