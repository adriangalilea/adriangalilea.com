import { siGithub } from "simple-icons";
import { BrandMark } from "@/components/ui/brand-mark";

/** GitHub's mark as a component, for the slots that take one (the footer's socials, a
 *  glass pill's icon); drawn by ui's BrandMark. */
export function GithubMark({ className }: { className?: string }) {
  return <BrandMark icon={siGithub} className={className} />;
}
