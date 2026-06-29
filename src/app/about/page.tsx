import type { Metadata } from "next";
import AboutContent from "./AboutContent";

export const metadata: Metadata = {
  title: "About GlobeVortex — AI-Powered Bilingual News Aggregator",
  description:
    "Learn how GlobeVortex uses Claude AI (Anthropic) to aggregate, classify and summarize international news from 50+ RSS sources in English and French every 15 minutes.",
  alternates: {
    canonical: "https://globevortex.com/about",
  },
  openGraph: {
    url: "https://globevortex.com/about",
    title: "About GlobeVortex — AI-Powered Bilingual News Aggregator",
    description:
      "How GlobeVortex uses Claude AI to aggregate and summarize world news in EN & FR.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GlobeVortex About" }],
  },
};

export default function AboutPage() {
  return <AboutContent />;
}
