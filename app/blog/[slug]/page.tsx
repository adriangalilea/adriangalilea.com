import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogSource, blogData, resolveCover, resolveOG } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { slugToGradient } from "@/lib/gradient";

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
		<article className="mx-auto w-full max-w-2xl px-4 pb-16 pt-24">
			{d.draft && (
				<div className="mb-8 rounded-lg border border-border/50 bg-muted/50 px-4 py-3 text-muted-foreground text-sm">
					This is a draft — unfinished and subject to change.
				</div>
			)}
			<header className="mb-12">
				<div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs uppercase tracking-wide">
					<time className="tabular-nums">
						{new Date(d.publishedAt).toLocaleDateString("en-US", {
							year: "numeric",
							month: "long",
							day: "numeric",
						})}
					</time>
					{d.tags.length > 0 && (
						<>
							<span>/</span>
							{d.tags.map((tag: string, i: number) => (
								<span key={tag}>
									<Link
										href={`/blog?tag=${encodeURIComponent(tag)}`}
										className="hover:text-foreground hover:underline decoration-accent-pop underline-offset-4"
									>
										{tag}
									</Link>
									{i < d.tags.length - 1 && ", "}
								</span>
							))}
						</>
					)}
				</div>
				<h1 className="font-bold text-4xl leading-[1.1] tracking-tight sm:text-5xl">
					{page.data.title}
				</h1>
				{page.data.description && (
					<p className="mt-5 text-xl leading-relaxed text-muted-foreground sm:text-2xl sm:leading-relaxed">
						{page.data.description}
					</p>
				)}
				{d.editedAt && (
					<p className="mt-4 text-muted-foreground text-xs tabular-nums">
						Last edited{" "}
						{new Date(d.editedAt).toLocaleDateString("en-US", {
							year: "numeric",
							month: "long",
							day: "numeric",
						})}
					</p>
				)}
			</header>

			<figure className="-mx-4 mb-14 sm:-mx-12 md:-mx-24 lg:-mx-32">
				{coverUrl ? (
					<div className="relative aspect-[2/1] w-full overflow-hidden rounded-2xl bg-black">
						<img
							src={coverUrl}
							alt=""
							aria-hidden
							className="absolute inset-0 h-full w-full scale-150 object-cover blur-3xl opacity-60"
						/>
						<img
							src={coverUrl}
							alt={page.data.title ?? ""}
							className="relative h-full w-full object-contain drop-shadow-lg"
						/>
					</div>
				) : (
					<div
						className="aspect-[3/1] w-full rounded-2xl"
						style={{ background: slugToGradient(params.slug) }}
					/>
				)}
			</figure>

			<div className="prose dark:prose-invert max-w-none prose-p:leading-[1.8]">
				<Mdx components={getMDXComponents()} />
			</div>
		</article>
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
