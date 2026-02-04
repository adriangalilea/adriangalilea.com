import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogSource, blogData, resolveCover, resolveOG, getRelatedPosts, toCardPost } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { PostCard, CoverImage } from "@/components/post-cards";

export default async function BlogPost(props: {
	params: Promise<{ slug: string }>;
}) {
	const params = await props.params;
	const page = blogSource.getPage([params.slug]);

	if (!page) notFound();
	const d = blogData(page);
	const Mdx = d.body;
	const coverUrl = resolveCover(page);

	return (
		<article className="pb-16">
			<figure className="mx-auto max-w-5xl px-4 pt-4 sm:pt-6">
				<div className={`w-full overflow-hidden rounded-2xl ${coverUrl ? "aspect-[2/1]" : "aspect-[3/1]"}`}>
					<CoverImage coverUrl={coverUrl} slug={params.slug} title={page.data.title ?? ""} sizes="(max-width: 1024px) 100vw, 1024px" priority />
				</div>
			</figure>

			<header className="mx-auto max-w-2xl px-4 pt-8">
				{d.isDraft && (
					<div className="mb-6 rounded-lg border border-border/50 bg-muted/50 px-4 py-3 text-muted-foreground text-sm">
						This is a draft — unfinished and subject to change.
					</div>
				)}
				{d.tags.length > 0 && (
					<div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs uppercase tracking-wide">
						{d.tags.map((tag: string, i: number) => (
							<span key={tag}>
								<Link
									href={`/blog?tag=${encodeURIComponent(tag)}`}
									className="text-accent-pop hover:underline underline-offset-4"
								>
									{tag}
								</Link>
								{i < d.tags.length - 1 && <span className="text-muted-foreground">,</span>}
							</span>
						))}
					</div>
				)}
				<h1 className="font-bold text-4xl leading-[1.1] tracking-tight sm:text-5xl">
					{page.data.title}
				</h1>
				{page.data.description && (
					<p className="mt-4 text-xl leading-relaxed text-foreground/85 sm:text-2xl sm:leading-relaxed">
						{page.data.description}
					</p>
				)}
				<div className="mt-4 flex flex-wrap items-center gap-x-3 text-muted-foreground text-xs tabular-nums">
					<time>
						{new Date(d.publishedAt).toLocaleDateString("en-US", {
							year: "numeric",
							month: "long",
							day: "numeric",
						})}
					</time>
					{d.lastModified && (
						<>
							<span>·</span>
							<span>
								Edited{" "}
								{new Date(d.lastModified).toLocaleDateString("en-US", {
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							</span>
						</>
					)}
				</div>
			</header>

			<div className="mx-auto max-w-2xl px-4 pt-8 prose prose-p:leading-[1.8]">
				<Mdx components={getMDXComponents()} />
			</div>

			<RelatedPosts slug={params.slug} currentTags={d.tags} />
		</article>
	);
}

function RelatedPosts({ slug, currentTags }: { slug: string; currentTags: string[] }) {
	const related = getRelatedPosts(slug).map((p) => {
		const card = toCardPost(p);
		const shared = card.tags.filter((t) => currentTags.includes(t));
		return { ...card, tags: shared };
	});
	if (related.length === 0) return null;

	return (
		<nav className="mx-auto max-w-5xl px-4 mt-16 pt-12 border-t border-border">
			<p className="text-muted-foreground text-xs uppercase tracking-widest mb-6">Keep reading</p>
			<div className="grid gap-6 sm:grid-cols-3">
				{related.map((post) => (
					<PostCard key={post.url} post={post} />
				))}
			</div>
		</nav>
	);
}

export async function generateMetadata(props: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const params = await props.params;
	const page = blogSource.getPage([params.slug]);

	if (!page) notFound();

	const ogUrl = await resolveOG(page);

	return {
		title: page.data.title,
		description: page.data.description,
		openGraph: {
			title: page.data.title,
			description: page.data.description,
			...(ogUrl && {
				images: [{ url: ogUrl, width: 1200, height: 630 }],
			}),
		},
		twitter: {
			card: "summary_large_image",
			title: page.data.title,
			description: page.data.description,
			...(ogUrl && { images: [ogUrl] }),
		},
	};
}

export function generateStaticParams(): { slug: string }[] {
	return blogSource.getPages().map((page) => ({
		slug: page.slugs[0],
	}));
}
