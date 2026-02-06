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

export function NavbarBreadcrumb() {
	const pathname = usePathname();
	const segments = pathname.split("/").filter(Boolean);

	// At root - show just the name as a plain link
	if (segments.length === 0) {
		return (
			<Link
				href="/"
				className="font-bold text-2xl tracking-tight transition-colors hover:text-accent-pop"
			>
				Adrian Galilea
			</Link>
		);
	}

	// Nested - show breadcrumb
	return (
		<Breadcrumb>
			<BreadcrumbList className="gap-1">
				<BreadcrumbItem>
					<BreadcrumbLink asChild className="font-bold text-2xl tracking-tight hover:text-accent-pop">
						<Link href="/">Adrian Galilea</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
				{segments.map((seg, i) => {
					const isLast = i === segments.length - 1;
					const href = "/" + segments.slice(0, i + 1).join("/");
					return (
						<Fragment key={href}>
							<BreadcrumbSeparator className="text-foreground-lowest/50 text-lg font-light">/</BreadcrumbSeparator>
							<BreadcrumbItem>
								{isLast ? (
									<BreadcrumbPage className="text-lg text-foreground-low">{seg}</BreadcrumbPage>
								) : (
									<BreadcrumbLink asChild className="text-lg hover:text-accent-pop">
										<Link href={href}>{seg}</Link>
									</BreadcrumbLink>
								)}
							</BreadcrumbItem>
						</Fragment>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
