"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type Props = {
	folderPaths: string[];
};

export function NavbarBreadcrumb({ folderPaths }: Props) {
	const pathname = usePathname();
	const folderSet = new Set(folderPaths);

	// Build breadcrumb from folder segments only
	const segments = pathname.split("/").filter(Boolean);
	const folderSegments: { seg: string; href: string }[] = [];

	for (let i = 0; i < segments.length; i++) {
		const href = "/" + segments.slice(0, i + 1).join("/");
		if (folderSet.has(href)) {
			folderSegments.push({ seg: segments[i], href });
		}
	}

	// At root or no folders in path - show just the name
	if (folderSegments.length === 0) {
		return (
			<Link
				href="/"
				className="font-bold text-2xl tracking-tight transition-colors hover:text-accent-pop"
			>
				Adrian Galilea
			</Link>
		);
	}

	// Show folders only
	return (
		<Breadcrumb>
			<BreadcrumbList className="gap-1">
				<BreadcrumbItem>
					<BreadcrumbLink asChild className="font-bold text-2xl tracking-tight hover:text-accent-pop">
						<Link href="/">Adrian Galilea</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
				{folderSegments.map((item) => (
					<Fragment key={item.href}>
						<BreadcrumbSeparator className="text-foreground-lowest/50 text-lg font-light">/</BreadcrumbSeparator>
						<BreadcrumbItem>
							<BreadcrumbLink asChild className="text-lg hover:text-accent-pop">
								<Link href={item.href}>{item.seg}</Link>
							</BreadcrumbLink>
						</BreadcrumbItem>
					</Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
