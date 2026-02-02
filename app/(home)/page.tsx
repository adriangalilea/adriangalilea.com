import Link from "next/link";
import { getBlogPosts } from "@/lib/source";
import { projects } from "@/data/projects";
import { FeaturedHero, PublishedList, DraftList } from "@/components/post-cards";

export default function Home() {
	const { published, drafts } = getBlogPosts();
	const featured = published[0];
	const rest = published.slice(1, 6);

	return (
		<main>
			<div className="mx-auto w-full max-w-6xl px-6 pt-10 sm:pt-16">
				<section className="mb-16">
					<p className="mb-4 text-muted-foreground text-xs uppercase tracking-widest">
						Projects
					</p>
					<ul className="space-y-1">
						{projects.map((p) => (
							<li key={p.title}>
								<Link
									href={p.link}
									className="group flex items-baseline gap-2 rounded-lg px-3 py-2 -mx-3 transition-colors hover:bg-card"
									{...(p.link.startsWith("http")
										? { target: "_blank", rel: "noopener noreferrer" }
										: {})}
								>
									<span className="font-medium group-hover:underline decoration-accent-pop underline-offset-4">
										{p.title}
									</span>
									{p.isComingSoon && (
										<span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
											soon
										</span>
									)}
									<span className="flex-1 border-b border-dotted border-border/50" />
									{p.techs.length > 0 && (
										<span className="text-muted-foreground text-xs">
											{p.techs.join(" · ")}
										</span>
									)}
								</Link>
							</li>
						))}
					</ul>
				</section>
			</div>

			{featured && (
				<section className="mx-auto w-full max-w-6xl px-6 pb-16">
					<div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
						<FeaturedHero post={featured} />

						<div className="flex flex-col">
							{rest.length > 0 && (
								<div>
									<p className="mb-4 text-muted-foreground text-xs uppercase tracking-widest">
										Published
									</p>
									<PublishedList posts={rest} startIndex={2} />
								</div>
							)}

							{drafts.length > 0 && (
								<div className={rest.length > 0 ? "mt-6 border-t border-border pt-6" : ""}>
									<p className="mb-3 text-muted-foreground text-xs uppercase tracking-widest">
										Drafts
									</p>
									<DraftList posts={drafts.slice(0, 5)} />
								</div>
							)}

							<Link
								href="/blog"
								className="mt-6 inline-block text-muted-foreground text-sm hover:text-foreground hover:underline decoration-accent-pop underline-offset-4"
							>
								all posts →
							</Link>
						</div>
					</div>
				</section>
			)}
		</main>
	);
}
