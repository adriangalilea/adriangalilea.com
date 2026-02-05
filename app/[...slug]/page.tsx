import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getContentByPath, getChildren, getAllContent, resolveOG, isPost, isFolder, getRecommendations, type Post, type Folder } from "@/lib/content";
import { renderMDX } from "@/lib/mdx";
import { getMDXComponents } from "@/mdx-components";
import { StatusBadge } from "@/components/status-badge";
import { TOC } from "@/components/toc";
import { CoverImage } from "@/components/cover-image";
import { MasonryGrid } from "@/components/masonry-grid";
import { RelatedSection } from "@/components/related-section";

type Props = {
	params: Promise<{ slug: string[] }>;
};

export default async function ContentPage({ params }: Props) {
	const { slug } = await params;
	const content = getContentByPath(slug);

	if (!content) notFound();

	if (isFolder(content)) {
		return <FolderView folder={content} />;
	}

	if (isPost(content)) {
		return <PostView post={content} />;
	}

	notFound();
}

async function PostView({ post }: { post: Post }) {
	const { mdxContent } = await renderMDX(post, getMDXComponents());

	return (
		<article className="pb-16">
			<div className="mx-auto max-w-[90rem] px-6">
				{post.cover && (
					<figure className="pt-4 sm:pt-6 mb-8 max-w-2xl lg:ml-[248px]">
						<div className="w-full overflow-hidden rounded-2xl aspect-[16/9]">
							<CoverImage
								cover={post.cover}
								slug={post.slug.join("/")}
								title={post.title ?? ""}
								sizes="(max-width: 1024px) 100vw, 672px"
								priority
							/>
						</div>
					</figure>
				)}

				<div className={`${!post.cover ? "pt-4 sm:pt-6" : ""} lg:flex lg:gap-12`}>
					<aside className="hidden lg:block lg:w-[200px] lg:shrink-0">
						<TOC items={post.toc} />
					</aside>

					<div className="min-w-0 max-w-2xl">
						<header>
							{post.isDraft && (
								<div className="mb-6 rounded-lg border border-border/50 bg-muted/50 px-4 py-3 text-muted-foreground text-sm">
									This is a draft — unfinished and subject to change.
								</div>
							)}
							{post.tags && post.tags.length > 0 && (
								<div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs uppercase tracking-wide">
									{post.tags.map((tag, i) => (
										<span key={tag}>
											<span className="text-accent-pop">{tag}</span>
											{i < post.tags!.length - 1 && <span className="text-muted-foreground">,</span>}
										</span>
									))}
								</div>
							)}
							{post.title && (
								<h1 className="font-bold text-4xl leading-[1.1] tracking-tight sm:text-5xl">
									{post.title}
								</h1>
							)}
							{post.description && (
								<p className="mt-4 text-xl leading-relaxed text-foreground/85 sm:text-2xl sm:leading-relaxed">
									{post.description}
								</p>
							)}
							{post.publishedAt && (
								<div className={`${post.title ? "mt-4" : ""} text-muted-foreground text-xs tabular-nums`}>
									<time>
										{new Date(post.publishedAt).toLocaleDateString("en-US", {
											year: "numeric",
											month: "long",
											day: "numeric",
										})}
									</time>
								</div>
							)}
						</header>

						<div className="pt-8 prose prose-p:leading-[1.8]">
							{mdxContent}
						</div>

					</div>
				</div>
			</div>

			{/* Recommendations - full width, dimmed until scroll/hover */}
			{(() => {
				const recs = getRecommendations(post, 6);
				if (recs.length === 0) return null;
				// Serialize for client component
				const items = recs.map((r) => ({
					path: r.path,
					title: r.type === "folder" ? r.title : r.title,
					description: r.description,
					cover: r.cover,
					tags: r.type === "post" ? r.tags : undefined,
					publishedAt: r.type === "post" && r.publishedAt ? r.publishedAt.toString() : undefined,
				}));
				return <RelatedSection items={items} />;
			})()}
		</article>
	);
}

async function FolderView({ folder }: { folder: Folder }) {
	const children = getChildren(folder.slug);
	const { mdxContent } = await renderMDX(folder, getMDXComponents());

	return (
		<div className="mx-auto w-full max-w-[90rem] px-4 py-6">
			{/* Breadcrumb */}
			{folder.slug.length > 1 && (
				<nav className="mb-6 text-sm text-foreground-lowest">
					<Link href="/" className="hover:text-foreground">Home</Link>
					{folder.slug.slice(0, -1).map((seg, i) => (
						<span key={i}>
							<span className="mx-2">/</span>
							<Link href={`/${folder.slug.slice(0, i + 1).join("/")}`} className="hover:text-foreground">
								{seg}
							</Link>
						</span>
					))}
				</nav>
			)}

			{/* Header */}
			<header className="mb-12">
				<div className="flex items-center gap-3 mb-4">
					<h1 className="font-bold text-4xl tracking-tight">{folder.title}</h1>
					{folder.status && <StatusBadge status={folder.status} />}
				</div>
				{folder.description && (
					<p className="text-xl text-foreground-low">{folder.description}</p>
				)}

				{/* Links */}
				{folder.links && Object.keys(folder.links).length > 0 && (
					<div className="mt-4 flex flex-wrap gap-3">
						{Object.entries(folder.links).map(([key, url]) => (
							<a
								key={key}
								href={url}
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm text-accent-pop hover:underline"
							>
								{key}
							</a>
						))}
					</div>
				)}

				{/* KPIs */}
				{folder.kpis && folder.kpis.length > 0 && (
					<div className="mt-6 flex flex-wrap gap-6">
						{folder.kpis.map((kpi) => (
							<div key={kpi.label}>
								<div className="text-2xl font-bold">{kpi.value}</div>
								<div className="text-sm text-foreground-lowest">{kpi.label}</div>
							</div>
						))}
					</div>
				)}

				{/* Techs */}
				{folder.techs && folder.techs.length > 0 && (
					<div className="mt-4 flex flex-wrap gap-2">
						{folder.techs.map((tech) => (
							<span key={tech} className="text-xs text-foreground-lowest bg-muted px-2 py-1 rounded">
								{tech}
							</span>
						))}
					</div>
				)}
			</header>

			{/* MDX Content */}
			{folder.content.trim() && (
				<div className="prose prose-p:leading-[1.8] mb-12">
					{mdxContent}
				</div>
			)}

			{/* Children */}
			{children.length > 0 && (
				<section>
					<MasonryGrid items={children} />
				</section>
			)}
		</div>
	);
}

export async function generateStaticParams() {
	return getAllContent().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const content = getContentByPath(slug);

	if (!content) return {};

	const title = isPost(content) ? content.title : content.title;
	const description = content.description;
	const ogUrl = await resolveOG(content);

	return {
		title,
		description,
		openGraph: {
			title,
			description,
			...(ogUrl && {
				images: [{ url: ogUrl, width: 1200, height: 630 }],
			}),
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			...(ogUrl && { images: [ogUrl] }),
		},
	};
}
