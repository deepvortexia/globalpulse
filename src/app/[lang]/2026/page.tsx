import type { Metadata } from "next";
import { getYearChapters } from "@/lib/highlights";
import type { MonthChapter } from "@/lib/highlights";
import type { Language } from "@/types";
import Footer from "@/components/Footer";
import VortexJourney from "./VortexJourney";

const SITE = "https://globevortex.com";
const YEAR = 2026;

// ISR: the underlying `yearly_highlights` table changes at most once a month
// (a future monthly cron will append the new month), so one regeneration per
// day is already generous. Deliberately long to protect the Vercel Hobby ISR
// Writes budget — do NOT lower this.
export const revalidate = 86400;

type PageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang === "fr" ? "fr" : "en";
  const title =
    locale === "fr"
      ? "2026 en revue — Le voyage dans le vortex de l'année"
      : "2026 in Review — A Journey Through the Year's Vortex";
  const description =
    locale === "fr"
      ? "Revivez les grands événements de 2026 mois par mois — politique, conflits, sports, tech et culture — dans une expérience immersive signée GlobeVortex."
      : "Relive the defining stories of 2026 month by month — politics, conflicts, sports, tech and culture — in an immersive scroll experience by GlobeVortex.";
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE}/${locale}/2026`,
      languages: {
        en: `${SITE}/en/2026`,
        fr: `${SITE}/fr/2026`,
        "x-default": `${SITE}/en/2026`,
      },
    },
    openGraph: {
      // Page-level openGraph replaces the root layout's, so restate these fields.
      type: "website",
      locale: locale === "fr" ? "fr_CA" : "en_US",
      alternateLocale: locale === "fr" ? "en_US" : "fr_CA",
      siteName: "GlobeVortex",
      url: `${SITE}/${locale}/2026`,
      title,
      description,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GlobeVortex 2026 in Review" }],
    },
  };
}

export default async function YearInReviewPage({ params }: PageProps) {
  const { lang } = await params;
  const language = (lang === "fr" ? "fr" : "en") as Language;

  // If the read fails during a revalidation we still render the journey with
  // every month as a "to be continued" chapter rather than erroring the page.
  let chapters: MonthChapter[];
  try {
    chapters = await getYearChapters(YEAR, language);
  } catch {
    chapters = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, highlights: [] }));
  }

  return (
    <>
      <VortexJourney language={language} year={YEAR} chapters={chapters} />
      <Footer language={language} />
    </>
  );
}
