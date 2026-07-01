import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { AnalyticsWrapper } from "@/components/AnalyticsWrapper";
import CookieBanner from "@/components/CookieBanner";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://globevortex.com"),
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
  authors: [{ name: "Yannick Boisclair", url: "https://globevortex.com/about" }],
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
    locale: "en_US",
    alternateLocale: "fr_CA",
    url: "https://globevortex.com",
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
    canonical: "https://globevortex.com",
    languages: {
      en: "https://globevortex.com",
      fr: "https://globevortex.com",
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

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gv-bg">
        <link rel="alternate" type="application/rss+xml" title="GlobeVortex" href="/feed.xml" />
        {children}
        <CookieBanner />
        <AnalyticsWrapper />
      </body>
    </html>
  );
}
