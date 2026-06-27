import type { Metadata } from "next";
import AboutContent from "./AboutContent";

export const metadata: Metadata = {
  title: "About GlobeVortex | World News AI Aggregator",
  description:
    "GlobeVortex is a bilingual FR/EN AI-powered world news aggregator. Discover international news powered by Claude AI, with 50+ sources worldwide.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About GlobeVortex | World News AI Aggregator",
    description:
      "GlobeVortex is a bilingual FR/EN AI-powered world news aggregator. Discover international news powered by Claude AI, with 50+ sources worldwide.",
    url: "/about",
    type: "website",
  },
};

export default function AboutPage() {
  return <AboutContent />;
}
