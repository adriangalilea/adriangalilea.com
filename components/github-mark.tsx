import { siGithub } from "simple-icons";

/** GitHub's mark, filled in the current colour, sized by its className. Lucide carries
 *  no brand marks, so it is drawn from simple-icons' 24-unit path, as ui's
 *  ProviderGlyph draws a provider. */
export function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      fill="currentColor"
      className={className}
    >
      <path d={siGithub.path} />
    </svg>
  );
}
