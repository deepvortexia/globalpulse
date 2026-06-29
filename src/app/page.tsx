import type { Metadata } from "next";
import { getArticles, getTopStories } from "@/lib/articles";
import type { Article } from "@/types";
import NewsBoard from "@/components/NewsBoard";

export const metadata: Metadata = {
  title: "GlobeVortex — Live World News · AI-Powered Bilingual Aggregator",
  description:
    "Follow the world's most important stories live — AI-curated international news in English and French from 50+ trusted global sources including BBC, Le Monde, CNN, Al Jazeera, Radio-Canada, RFI and more.",
  alternates: {
    canonical: "https://globevortex.com",
  },
  openGraph: {
    url: "https://globevortex.com",
    title: "GlobeVortex — Live World News",
    description:
      "AI-curated international news in English and French from 50+ trusted global sources.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GlobeVortex" }],
  },
};

// ISR: HTML is server-rendered with data baked in and revalidated every 60s.
// Articles are read from Supabase (populated by the /api/cron/fetch-news
// background job) rather than fetched live from RSS — instant page loads.
export const revalidate = 60;

// NewsBoard filters by language + category and paginates entirely client-side,
// so hand it a broad pool spanning both languages and every category.
const HOME_POOL_SIZE = 1000;
const HOME_WINDOW_HOURS = 168;

export default async function Home() {
  let articles: Article[] = [];
  // Top Stories is a virtual category: the active-category state lives client-
  // side in NewsBoard, so we can't branch the fetch on it here. Instead we
  // prefetch the high-importance set alongside the main pool and hand both to
  // NewsBoard, which swaps in topStories when the "top" pill is selected.
  let topStories: Article[] = [];
  let error: string | null = null;

  try {
    [articles, topStories] = await Promise.all([
      getArticles({
        category: "all",
        page: 1,
        pageSize: HOME_POOL_SIZE,
        sinceHours: HOME_WINDOW_HOURS,
      }),
      getTopStories(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load news";
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://globevortex.com/#website",
        "url": "https://globevortex.com",
        "name": "GlobeVortex",
        "description": "Bilingual FR/EN AI-powered international news aggregator — world news summarized by Claude AI from 50+ trusted sources.",
        "inLanguage": ["en", "fr"],
      },
      {
        "@type": "NewsMediaOrganization",
        "@id": "https://globevortex.com/#organization",
        "name": "GlobeVortex",
        "url": "https://globevortex.com",
        "logo": {
          "@type": "ImageObject",
          "url": "https://globevortex.com/logo.png",
          "width": 512,
          "height": 512,
        },
        "foundingDate": "2026",
        "founder": {
          "@type": "Person",
          "name": "Yannick Boisclair",
        },
        "description":
          "AI-powered bilingual news aggregator covering world affairs, politics, economy, science, climate, health, culture and sports.",
        "publishingPrinciples": "https://globevortex.com/about",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NewsBoard articles={articles} topStories={topStories} error={error} />
    </>
  );
}
