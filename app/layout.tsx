import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import Link from "next/link";
import { Github, Send, Mail, Rss } from "lucide-react";
import { LiquidGlass, LiquidGlassFilter } from "@/components/liquid-glass";
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
					<LiquidGlassFilter />
					<LiquidGlass as="nav" tint="var(--glass-l0)" className="sticky top-0 z-50 border-b border-glass-l0-border">
						<div className="mx-auto flex h-14 w-full max-w-[90rem] items-baseline px-6 gap-4 pt-3.5">
							<Link
								href="/"
								className="font-bold text-2xl tracking-tight transition-colors hover:text-accent-pop"
							>
								Adrian Galilea
							</Link>
							<Link href="/blog" className="text-base font-medium text-foreground-low transition-colors hover:text-accent-pop">
								Blog
							</Link>
						</div>
					</LiquidGlass>
					<div className="flex-1">
						{children}
					</div>
					<LiquidGlass as="footer" tint="var(--glass-l0)" className="border-t border-glass-l0-border">
						<div className="mx-auto flex h-12 max-w-7xl items-center justify-center gap-3 px-6">
							{socialLinks.map((l) => (
								<Link
									key={l.label}
									href={l.href}
									{...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
									className="group/social flex h-8 w-8 items-center justify-center rounded-full text-foreground-lowest transition-colors hover:text-accent-pop hover:bg-accent-pop/10"
									aria-label={l.label}
								>
									<l.icon size={16} strokeWidth={1.5} />
								</Link>
							))}
						</div>
					</LiquidGlass>
				</RootProvider>
			</body>
		</html>
	);
}
