import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import Link from "next/link";
import { Github, Send, Mail, Rss } from "lucide-react";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "Adrian Galilea",
		template: "%s | Adrian Galilea",
	},
	description: "Adrian Galilea's personal site",
	metadataBase: new URL("https://adriangalilea.com"),
	openGraph: {
		siteName: "Adrian Galilea",
	},
};

const socialLinks = [
	{ href: "https://github.com/adriangalilea", label: "GitHub", icon: Github, external: true },
	{ href: "https://t.me/adriangalilea", label: "Telegram", icon: Send, external: true },
	{ href: "mailto:adriangalilea@gmail.com", label: "Email", icon: Mail, external: false },
	{ href: "/blog/rss.xml", label: "RSS", icon: Rss, external: false },
];

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
			>
				<RootProvider>
					<nav className="sticky top-0 z-50 border-b border-border/50 bg-card/90 backdrop-blur-sm">
						<div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6">
							<Link
								href="/"
								className="font-bold text-base tracking-tight hover:underline decoration-accent-pop underline-offset-4"
							>
								Adrian Galilea
							</Link>
							<div className="flex items-center gap-6">
								<Link href="/blog" className="text-muted-foreground text-sm hover:underline decoration-accent-pop underline-offset-4">
									Blog
								</Link>
							</div>
						</div>
					</nav>
					<div className="flex-1">
						{children}
					</div>
					<footer className="border-t border-border/50">
						<div className="mx-auto flex h-12 max-w-6xl items-center justify-center gap-3 px-6">
							{socialLinks.map((l) => (
								<Link
									key={l.label}
									href={l.href}
									{...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
									className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-pop/10 text-accent-pop transition-colors hover:bg-accent-pop/20"
									aria-label={l.label}
								>
									<l.icon size={16} strokeWidth={1.5} />
								</Link>
							))}
						</div>
					</footer>
				</RootProvider>
			</body>
		</html>
	);
}
