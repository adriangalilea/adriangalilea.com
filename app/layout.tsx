import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { HideOnScroll } from "@/components/hide-on-scroll";
import { GlassSurface, LiquidGlassFilter } from "@/components/liquid-glass";
import { NavbarBreadcrumb } from "@/components/navbar-breadcrumb";
import { ThemeProvider } from "@/components/theme-provider";
import { socials } from "@/data/site";
import { getAllFolders } from "@/lib/content";
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

const socialLinks = socials.map((s) => ({
  href: s.link,
  label: s.label,
  icon: s.icon,
  external: s.link.startsWith("http"),
}));

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const folderPaths = getAllFolders().map((f) => f.path);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
      >
        <ThemeProvider>
          <NuqsAdapter>
            <LiquidGlassFilter />
            {/* Desktop: full-width bar */}
            <HideOnScroll className="hidden sm:block sticky top-0 z-50">
              <GlassSurface as="nav" layer="l0" shadow="sm" distortion>
                <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center px-6 gap-4">
                  <NavbarBreadcrumb folderPaths={folderPaths} />
                </div>
              </GlassSurface>
            </HideOnScroll>
            {/* Mobile: floating pill */}
            <HideOnScroll className="sm:hidden sticky top-0 z-50 py-3 px-6">
              <GlassSurface
                as="nav"
                layer="l0"
                shadow="lg"
                distortion
                className="w-full rounded-full px-5 py-2"
              >
                <NavbarBreadcrumb folderPaths={folderPaths} />
              </GlassSurface>
            </HideOnScroll>
            <div className="flex-1">{children}</div>
            <GlassSurface as="footer" layer="l0" distortion>
              <div className="mx-auto flex h-12 max-w-7xl items-center justify-center gap-3 px-6">
                {socialLinks.map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    {...(l.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="group/social flex h-8 w-8 items-center justify-center rounded-full text-foreground-lowest transition-colors hover:text-accent-pop hover:bg-accent-pop/10"
                    aria-label={l.label}
                  >
                    <l.icon size={16} strokeWidth={1.5} />
                  </Link>
                ))}
              </div>
            </GlassSurface>
          </NuqsAdapter>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
