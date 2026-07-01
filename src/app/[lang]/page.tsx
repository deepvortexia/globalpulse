import type { Metadata } from "next";
import { getArticles, getTopStoriesByLanguage } from "@/lib/articles";
import type { TopStoriesByLanguage } from "@/lib/articles";
import type { Article, Language } from "@/types";
import NewsBoard from "@/components/NewsBoard";

const SITE = "https://globevortex.com";

type HomeProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: HomeProps): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang === "fr" ? "fr" : "en";
  return {
    title: "GlobeVortex — Live World News · AI-Powered Bilingual Aggregator",
    description:
      "Follow the world's most important stories live — AI-curated international news in English and French from 50+ trusted global sources including BBC, Le Monde, CNN, Al Jazeera, Radio-Canada, RFI and more.",
    alternates: {
      canonical: `${SITE}/${locale}`,
      languages: {
        en: `${SITE}/en`,
        fr: `${SITE}/fr`,
        "x-default": `${SITE}/en`,
      },
    },
    openGraph: {
      // A page-level openGraph replaces (not deep-merges) the root layout's, so
      // og:type must be restated here or it goes missing on the homepage.
      type: "website",
      url: `${SITE}/${locale}`,
      title: "GlobeVortex — Live World News",
      description:
        "AI-curated international news in English and French from 50+ trusted global sources.",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GlobeVortex" }],
    },
  };
}

// ISR: HTML is server-rendered with data baked in and revalidated every 60s.
// Articles are read from Supabase (populated by the /api/cron/fetch-news
// background job) rather than fetched live from RSS — instant page loads.
export const revalidate = 60;

// NewsBoard filters by language + category and paginates entirely client-side,
// so hand it a broad pool spanning both languages and every category.
const HOME_POOL_SIZE = 1000;
const HOME_WINDOW_HOURS = 168;

export default async function Home({ params }: HomeProps) {
  const { lang } = await params;
  const language = (lang === "fr" ? "fr" : "en") as Language;

  let articles: Article[] = [];
  // Top Stories is a virtual category, and the active category lives in client
  // state inside NewsBoard, so we prefetch the high-importance set for BOTH
  // languages (each a full rail) alongside the main pool and hand them to
  // NewsBoard, which swaps in the matching-language array when "top" is picked.
  let topStories: TopStoriesByLanguage = { en: [], fr: [] };
  let error: string | null = null;

  try {
    [articles, topStories] = await Promise.all([
      getArticles({
        category: "all",
        page: 1,
        pageSize: HOME_POOL_SIZE,
        sinceHours: HOME_WINDOW_HOURS,
      }),
      getTopStoriesByLanguage(),
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
        "url": `${SITE}/${language}`,
        "name": "GlobeVortex",
        "description": "Bilingual FR/EN AI-powered international news aggregator — world news summarized by Claude AI from 50+ trusted sources.",
        "inLanguage": ["en", "fr"],
      },
      {
        "@type": "NewsMediaOrganization",
        "@id": "https://globevortex.com/#organization",
        "name": "GlobeVortex",
        "url": SITE,
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
        "publishingPrinciples": `${SITE}/${language}/about`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NewsBoard
        articles={articles}
        topStories={topStories}
        error={error}
        language={language}
      />
    </>
  );
}
