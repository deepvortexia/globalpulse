import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { AnalyticsWrapper } from "@/components/AnalyticsWrapper";
import CookieBanner from "@/components/CookieBanner";
import type { Language } from "@/types";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const SITE = "https://globevortex.com";
const LOCALES = ["en", "fr"] as const;

// Pre-render both locale shells at build time.
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

// Per-locale metadata: canonical points at this locale's home, hreflang lists
// both locales plus an x-default, and the OG locale flips to match. This
// replaces the old root layout's static `alternates.languages` block, which
// (incorrectly) pointed both languages at the bare domain.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang === "fr" ? "fr" : "en";

  return {
    metadataBase: new URL(SITE),
    title: {
      default: "GlobeVortex — Live World News · AI-Powered Bilingual Aggregator",
      template: "%s | GlobeVortex",
    },
    description:
      "GlobeVortex aggregates live international news from 50+ trusted sources worldwide, summarized in English and French by Claude AI. World affairs, politics, economy, science, climate, health, culture and sports.",
    keywords: [
      "world news",
      "international news",
      "bilingual news",
      "AI news aggregator",
      "actualités mondiales",
      "actualités internationales",
      "agrégateur nouvelles IA",
      "nouvelles bilingues",
      "nouvelles en français",
      "Claude AI news",
      "live news",
      "top stories",
      "breaking news",
      "GlobeVortex",
    ],
    authors: [{ name: "Yannick Boisclair", url: `${SITE}/${locale}/about` }],
    creator: "Yannick Boisclair",
    publisher: "GlobeVortex — DeepVortex",
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
    openGraph: {
      type: "website",
      locale: locale === "fr" ? "fr_CA" : "en_US",
      alternateLocale: locale === "fr" ? "en_US" : "fr_CA",
      url: `${SITE}/${locale}`,
      siteName: "GlobeVortex",
      title: "GlobeVortex — Live World News · AI-Powered Bilingual Aggregator",
      description:
        "Live international news from 50+ sources, summarized in EN & FR by Claude AI.",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "GlobeVortex — Live World News",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "GlobeVortex — Live World News",
      description:
        "Live international news from 50+ sources, summarized in EN & FR by Claude AI.",
      images: ["/og-image.png"],
      creator: "@globevortex",
    },
    alternates: {
      canonical: `${SITE}/${locale}`,
      languages: {
        en: `${SITE}/en`,
        fr: `${SITE}/fr`,
        "x-default": `${SITE}/en`,
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  colorScheme: "dark",
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  // Backstop: the proxy only ever routes /en and /fr here, but guard against a
  // stray non-locale segment reaching the [lang] catch-all (e.g. /about before
  // the proxy runs in some edge cases) rather than rendering a bogus locale.
  if (lang !== "en" && lang !== "fr") notFound();
  const language = lang as Language;

  return (
    <html
      lang={language}
      className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gv-bg">
        <link
          rel="alternate"
          type="application/rss+xml"
          title="GlobeVortex"
          href={`/${language}/feed.xml`}
        />
        {children}
        <CookieBanner lang={language} />
        <AnalyticsWrapper />
      </body>
    </html>
  );
}
