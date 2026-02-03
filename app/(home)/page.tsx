import Link from "next/link";
import { getBlogPosts } from "@/lib/source";
import { projects } from "@/data/projects";
import { FeaturedHero, PublishedList, DraftList } from "@/components/post-cards";
import { StatusBadge } from "@/components/status-badge";

export default function Home() {
	const { published, drafts } = getBlogPosts();
	const featured = published[0];
	const rest = published.slice(1, 6);

	return (
		<main>
			<div className="mx-auto w-full max-w-6xl px-6 pt-12 sm:pt-20">
				<section className="mb-20">
					<h2 className="mb-6 text-lg font-semibold tracking-tight">
						Projects
					</h2>
					<ul className="space-y-1">
						{projects.map((p) => (
							<li key={p.title}>
								<Link
									href={p.link}
									className="group block rounded-lg px-3 py-2.5 -mx-3 transition-colors hover:bg-card"
									{...(p.link.startsWith("http")
										? { target: "_blank", rel: "noopener noreferrer" }
										: {})}
								>
									<span className="flex items-center gap-2">
										<span className="font-medium group-hover:underline decoration-accent-pop underline-offset-4">
											{p.title}
										</span>
										{p.status && <StatusBadge status={p.status} />}
										<span className="flex-1 border-b border-dotted border-border/50" />
										{p.techs.length > 0 && (
											<span className="shrink-0 text-muted-foreground text-xs">
												{p.techs.join(" · ")}
											</span>
										)}
									</span>
									{p.description && (
										<span className="mt-0.5 block text-muted-foreground text-sm">
											{p.description}
										</span>
									)}
								</Link>
							</li>
						))}
					</ul>
				</section>
			</div>

			{featured && (
				<section className="mx-auto w-full max-w-6xl px-6 pb-20">
					<h2 className="mb-6 text-lg font-semibold tracking-tight">
						Writing
					</h2>
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
