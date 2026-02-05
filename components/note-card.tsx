import type { Post } from "@/lib/content";
import { renderMDXString } from "@/lib/mdx";
import { getMDXComponents } from "@/mdx-components";
import { ClickableCard } from "@/components/clickable-card";
import { cn } from "@/lib/utils";

const cardBase = "rounded-xl border border-white/10 bg-card/80 backdrop-blur-sm overflow-hidden transition-all duration-200 ease-out";
const cardHover = "hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg hover:border-white/20";
const cardDraft = "opacity-50 grayscale-[30%]";

export async function NoteCard({ post }: { post: Post }) {
	const { mdxContent } = await renderMDXString(post.content, getMDXComponents());

	return (
		<ClickableCard href={post.path} className={cn("group cursor-pointer", cardBase, cardHover, "p-4", post.isDraft && cardDraft)}>
			<div className="prose prose-sm max-w-none prose-p:my-0 prose-p:leading-relaxed">
				{mdxContent}
			</div>
			{post.publishedAt && (
				<time className="mt-3 block text-xs text-foreground-lowest">
					{new Date(post.publishedAt).toLocaleDateString("en-US", {
						year: "numeric",
						month: "short",
						day: "numeric",
					})}
				</time>
			)}
		</ClickableCard>
	);
}
