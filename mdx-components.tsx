import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";

export function getMDXComponents(): MDXComponents {
	return {
		a: ({ href, children, ...props }) => {
			if (href?.startsWith("/") || href?.startsWith("#")) {
				return <Link href={href} {...props}>{children}</Link>;
			}
			return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
		},
		img: ({ src, alt, ...props }) => {
			if (!src) return null;
			return (
				<Image
					src={src}
					alt={alt ?? ""}
					width={800}
					height={450}
					className="rounded-lg"
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
