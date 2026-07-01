import type { Metadata } from "next";
import type { Language } from "@/types";
import AboutContent from "./AboutContent";

const SITE = "https://globevortex.com";

type AboutPageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang === "fr" ? "fr" : "en";
  return {
    title: "About GlobeVortex — AI-Powered Bilingual News Aggregator",
    description:
      "Learn how GlobeVortex uses Claude AI (Anthropic) to aggregate, classify and summarize international news from 50+ RSS sources in English and French every 15 minutes.",
    alternates: {
      canonical: `${SITE}/${locale}/about`,
      languages: {
        en: `${SITE}/en/about`,
        fr: `${SITE}/fr/about`,
        "x-default": `${SITE}/en/about`,
      },
    },
    openGraph: {
      // Page-level openGraph replaces the root layout's, so restate og:type.
      type: "website",
      url: `${SITE}/${locale}/about`,
      title: "About GlobeVortex — AI-Powered Bilingual News Aggregator",
      description:
        "How GlobeVortex uses Claude AI to aggregate and summarize world news in EN & FR.",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GlobeVortex About" }],
    },
  };
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { lang } = await params;
  const language = (lang === "fr" ? "fr" : "en") as Language;
  return <AboutContent language={language} />;
}
