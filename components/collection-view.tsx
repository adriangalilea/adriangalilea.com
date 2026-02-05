import Link from "next/link";
import type { Content, Folder } from "@/lib/content";
import { isPost, getTagsFromContent, getChildrenForSlug } from "@/lib/content";
import { renderMDX } from "@/lib/mdx";
import { getMDXComponents } from "@/mdx-components";
import { StatusBadge } from "@/components/status-badge";
import { MasonryGrid } from "@/components/masonry";
import { TagFilter } from "@/components/tag-filter";

type Props = {
	folder?: Folder;
	slug: string[];
	tag: string | null;
};

export async function CollectionView({ folder, slug, tag }: Props) {
	const children = getChildrenForSlug(slug);
	const allTags = getTagsFromContent(children);

	const filteredChildren = tag
		? children.filter((c) => isPost(c) && c.tags.includes(tag))
		: children;

	const mdxContent = folder?.content.trim()
		? (await renderMDX(folder, getMDXComponents())).mdxContent
		: null;

	return (
		<div className="mx-auto w-full max-w-[90rem] px-4 py-6">
			{/* Breadcrumb - only for nested folders */}
			{slug.length > 1 && (
				<nav className="mb-6 text-sm text-foreground-lowest">
					<Link href="/" className="hover:text-foreground">
						Home
					</Link>
					{slug.slice(0, -1).map((seg, i) => (
						<span key={seg}>
							<span className="mx-2">/</span>
							<Link href={`/${slug.slice(0, i + 1).join("/")}`} className="hover:text-foreground">
								{seg}
							</Link>
						</span>
					))}
				</nav>
			)}

			{/* Folder Header - only if folder metadata exists */}
			{folder && (
				<header className="mb-12">
					<div className="flex items-center gap-3 mb-4">
						<h1 className="font-bold text-4xl tracking-tight">{folder.title}</h1>
						{folder.status && <StatusBadge status={folder.status} />}
					</div>
					{folder.description && <p className="text-xl text-foreground-low">{folder.description}</p>}

					{/* Links */}
					{Object.keys(folder.links).length > 0 && (
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
					{folder.kpis.length > 0 && (
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
					{folder.techs.length > 0 && (
						<div className="mt-4 flex flex-wrap gap-2">
							{folder.techs.map((tech) => (
								<span key={tech} className="text-xs text-foreground-lowest bg-muted px-2 py-1 rounded">
									{tech}
								</span>
							))}
						</div>
					)}
				</header>
			)}

			{/* MDX Content */}
			{mdxContent && <div className="prose prose-p:leading-[1.8] mb-12">{mdxContent}</div>}

			{/* Tag Filter */}
			{allTags.length > 0 && <TagFilter tags={allTags} />}

			{/* Children Grid */}
			{filteredChildren.length > 0 && (
				<section>
					<MasonryGrid items={filteredChildren} />
				</section>
			)}
		</div>
	);
}
