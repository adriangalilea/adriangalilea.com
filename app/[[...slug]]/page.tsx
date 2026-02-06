import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
	getContentByPath,
	getAllContent,
	resolveOG,
	isNote,
	isPage,
	isFolder,
	getRecommendations,
	type Note,
	type Page,
	type Folder,
} from "@/lib/content";
import { renderMDX } from "@/lib/mdx";
import { getMDXComponents } from "@/mdx-components";
import { TOC } from "@/components/toc";
import { CoverImage } from "@/components/cover-image";
import { MasonryGrid } from "@/components/masonry";
import { RelatedSection } from "@/components/related-section";
import { PenLine } from "lucide-react";
import { CollectionView } from "@/components/collection-view";

type Props = {
	params: Promise<{ slug?: string[] }>;
};

export default async function ContentPage({ params }: Props) {
	const { slug = [] } = await params;

	// Empty slug = root collection
	if (slug.length === 0) {
		return <CollectionView slug={[]} />;
	}

	const content = getContentByPath(slug);
	if (!content) notFound();

	if (isNote(content)) {
		return <NoteView note={content} />;
	}

	if (isPage(content)) {
		return <PageView page={content} />;
	}

	if (isFolder(content)) {
		return <CollectionView folder={content} slug={slug} />;
	}

	notFound();
}

// ============================================================================
// NOTE VIEW - minimal, tags + content + date
// ============================================================================

async function NoteView({ note }: { note: Note }) {
	const { mdxContent } = await renderMDX(note, getMDXComponents());
	const recs = getRecommendations(note, 6);

	return (
		<article className="pb-16">
			<div className="mx-auto max-w-[90rem] px-6">
				<div className="pt-4 sm:pt-6 lg:flex lg:gap-12">
					{/* Empty aside for alignment with PageView */}
					<aside className="hidden lg:block lg:w-[200px] lg:shrink-0" />

					<div className="min-w-0 max-w-2xl">
						{note.isDraft && (
							<div className="mb-6 rounded-lg border border-border/50 bg-muted/50 px-4 py-3 text-muted-foreground text-sm">
								This is a draft — unfinished and subject to change.
							</div>
						)}

						{note.tags.length > 0 && (
							<div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs uppercase tracking-wide">
								{note.tags.map((tag, i) => (
									<span key={tag}>
										<span className="text-accent-pop">{tag}</span>
										{i < note.tags.length - 1 && <span className="text-muted-foreground">,</span>}
									</span>
								))}
							</div>
						)}

						<div className="prose prose-p:leading-[1.8]">{mdxContent}</div>

						{note.publishedAt && (
							<time className="mt-6 block text-xs text-foreground-lowest tabular-nums">
								{new Date(note.publishedAt).toLocaleDateString("en-US", {
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							</time>
						)}
					</div>
				</div>
			</div>

			{recs.length > 0 && (
				<RelatedSection>
					<MasonryGrid items={recs} />
				</RelatedSection>
			)}
		</article>
	);
}

// ============================================================================
// PAGE VIEW - full article with TOC
// ============================================================================

async function PageView({ page }: { page: Page }) {
	const { mdxContent } = await renderMDX(page, getMDXComponents());
	const recs = getRecommendations(page, 6);

	return (
		<article className="pb-16">
			<div className="mx-auto max-w-[90rem] px-6">
				{page.cover && (
					<figure className="pt-4 sm:pt-6 mb-8 max-w-2xl lg:ml-[248px]">
						<div className="w-full overflow-hidden rounded-2xl aspect-[16/9]">
							<CoverImage
								cover={page.cover}
								slug={page.slug.join("/")}
								title={page.title}
								sizes="(max-width: 1024px) 100vw, 672px"
								priority
							/>
						</div>
					</figure>
				)}

				<div className={`${!page.cover ? "pt-4 sm:pt-6" : ""} lg:flex lg:gap-12`}>
					<aside className="hidden lg:block lg:w-[200px] lg:shrink-0">
						<TOC items={page.toc} />
					</aside>

					<div className="min-w-0 max-w-2xl">
						<header>
							{page.isDraft && (
								<div className="mb-6 rounded-lg border border-border/50 bg-muted/50 px-4 py-3 text-muted-foreground text-sm">
									This is a draft — unfinished and subject to change.
								</div>
							)}
							{page.tags.length > 0 && (
								<div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs uppercase tracking-wide">
									{page.tags.map((tag, i) => (
										<span key={tag}>
											<span className="text-accent-pop">{tag}</span>
											{i < page.tags.length - 1 && <span className="text-muted-foreground">,</span>}
										</span>
									))}
								</div>
							)}
							<h1 className="font-bold text-4xl leading-[1.1] tracking-tight sm:text-5xl">{page.title}</h1>
							{page.description && (
								<p className="mt-4 text-xl leading-relaxed text-foreground/85 sm:text-2xl sm:leading-relaxed">
									{page.description}
								</p>
							)}
							{page.publishedAt && (
								<div className="mt-4 text-muted-foreground text-xs tabular-nums">
									<time>
										{new Date(page.publishedAt).toLocaleDateString("en-US", {
											year: "numeric",
											month: "long",
											day: "numeric",
										})}
									</time>
									{page.updatedAt && (
										<>
											<span className="mx-2">·</span>
											<PenLine className="size-3.5 inline-block mr-1" strokeWidth={1.5} />
											<time>
												{new Date(page.updatedAt).toLocaleDateString("en-US", {
													year: "numeric",
													month: "long",
													day: "numeric",
												})}
											</time>
										</>
									)}
								</div>
							)}
						</header>

						<div className="mt-8 prose prose-p:leading-[1.8]">{mdxContent}</div>
					</div>
				</div>
			</div>

			{recs.length > 0 && (
				<RelatedSection>
					<MasonryGrid items={recs} />
				</RelatedSection>
			)}
		</article>
	);
}

// ============================================================================
// STATIC PARAMS & METADATA
// ============================================================================

export async function generateStaticParams() {
	const all = getAllContent();
	// Include empty slug for root
	return [{ slug: undefined }, ...all.map((c) => ({ slug: c.slug }))];
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
	const { slug = [] } = await params;

	// Root has default metadata from layout
	if (slug.length === 0) {
		return {};
	}

	const content = getContentByPath(slug);
	if (!content) return {};

	const title = isNote(content) ? undefined : (content as Page | Folder).title;
	const description = isNote(content)
		? content.content.slice(0, 160)
		: ((content as Page | Folder).description ?? undefined);
	const ogUrl = await resolveOG(content);

	return {
		title,
		description,
		openGraph: {
			title,
			description: description ?? undefined,
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
