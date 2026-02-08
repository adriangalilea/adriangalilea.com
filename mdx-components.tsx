import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";
import { getContentByPath, isNote } from "@/lib/content";
import { Card } from "@/components/card";
import { renderMDXString } from "@/lib/mdx";

async function ContentQuote({ slug }: { slug: string }) {
	const parts = slug.split("/");
	const note = getContentByPath(parts);
	if (!note || !isNote(note)) return null;
	const { mdxContent } = await renderMDXString(note.content, getMDXComponents());
	return <div className="not-prose my-6"><Card content={note} renderedNoteContent={mdxContent} /></div>;
}

export function getMDXComponents(): MDXComponents {
	return {
		ContentQuote,
		a: ({ href, children, ...props }) => {
			if (href?.startsWith("/") || href?.startsWith("#")) {
				return <Link href={href} {...props}>{children}</Link>;
			}
			return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
		},
		img: ({ src, alt, ...props }) => {
			if (!src) return null;
			const isExternal = typeof src === "string" && src.startsWith("http");
			const isBadge = isExternal && /shields\.io|pepy\.tech\/badge|badgen\.net|badge/.test(src);
			if (isBadge) {
				// biome-ignore lint: badges render inline at natural size
				return <img src={src} alt={alt ?? ""} className="badge" {...props} />;
			}
			if (isExternal) {
				// biome-ignore lint: external images bypass next/image
				return <img src={src} alt={alt ?? ""} {...props} />;
			}
			const isAnimated = typeof src === "string" && src.endsWith(".gif");
			return (
				<Image
					src={src}
					alt={alt ?? ""}
					width={800}
					height={450}
					className="rounded-lg"
					unoptimized={isAnimated}
					{...props}
				/>
			);
		},
	};
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
	return {
		...getMDXComponents(),
		...components,
	};
}
