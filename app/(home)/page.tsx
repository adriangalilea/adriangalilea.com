import Link from "next/link";
import { getBlogPosts, toCardPost } from "@/lib/source";
import { projects, type Project } from "@/data/projects";
import { FeaturedHero, PostCardCompactList } from "@/components/post-cards";
import { StatusBadge } from "@/components/status-badge";
import { LiquidGlass } from "@/components/liquid-glass";

const STATUS_HOVER: Record<NonNullable<Project["status"]>, { bg: string; text: string }> = {
	soon: { bg: "rgba(139,92,246,0.06)", text: "rgb(167,139,250)" },
	sunset: { bg: "rgba(251,113,133,0.06)", text: "rgb(251,113,133)" },
	lab: { bg: "rgba(34,211,238,0.06)", text: "rgb(34,211,238)" },
	shipped: { bg: "rgba(250,204,21,0.06)", text: "rgb(250,204,21)" },
};

export default function Home() {
	const { published, drafts } = getBlogPosts();
	const cards = published.map(toCardPost);
	const draftCards = drafts.map(toCardPost);
	const featured = cards[0];
	const rest = [...cards.slice(1, 4), ...draftCards.slice(0, 2)];

	return (
		<main className="relative z-[1]">
			{featured && (
				<div className="mx-auto w-full max-w-[90rem] px-6 pt-8">
					<LiquidGlass as="section" tint="var(--glass-l1)" className="mb-10 rounded-2xl border border-glass-l1-border p-6 sm:p-8">
						<h2 className="mb-6 text-xl font-semibold tracking-tight">
							Writings
						</h2>
						<div className="grid gap-8 lg:grid-cols-[1.618fr_1fr]">
							<FeaturedHero post={featured} />

							<div className="flex flex-col">
								{rest.length > 0 && (
									<PostCardCompactList posts={rest} />
								)}

								<Link
									href="/blog"
									className="mt-6 inline-block text-foreground-lowest text-sm hover:text-foreground hover:underline decoration-accent-pop underline-offset-4"
								>
									all posts →
								</Link>
							</div>
						</div>
					</LiquidGlass>
				</div>
			)}

			<div className="mx-auto w-full max-w-[90rem] px-6 pb-20">
				<LiquidGlass as="section" tint="var(--glass-l1)" className="rounded-2xl border border-glass-l1-border p-6 sm:p-8">
					<h2 className="mb-6 text-xl font-semibold tracking-tight">
						Projects
					</h2>
					<ul className="space-y-1">
						{projects.map((p) => (
							<li key={p.title}>
								<Link
									href={p.link}
									className="group block rounded-lg px-3 py-2.5 -mx-3 transition-colors hover:bg-[var(--row-hover)]"
									style={{ "--row-hover": p.status ? STATUS_HOVER[p.status].bg : "rgba(255,255,255,0.04)", "--row-text": p.status ? STATUS_HOVER[p.status].text : "inherit" } as React.CSSProperties}
									{...(p.link.startsWith("http")
										? { target: "_blank", rel: "noopener noreferrer" }
										: {})}
								>
									<span className="flex items-center gap-2">
										<span className="font-semibold transition-colors group-hover:text-[var(--row-text)]">
											{p.title}
										</span>
										{p.status && <StatusBadge status={p.status} />}
										<span className="flex-1 border-b border-dotted border-border/50" />
										{p.techs.length > 0 && (
											<span className="shrink-0 text-foreground-lowest text-sm">
												{p.techs.join(" · ")}
											</span>
										)}
									</span>
									{p.description && (
										<span className="mt-0.5 block text-foreground-low text-sm">
											{p.description}
										</span>
									)}
								</Link>
							</li>
						))}
					</ul>
				</LiquidGlass>
			</div>
		</main>
	);
}
