import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/articles";
import { categoryLabel } from "@/lib/categories";
import type { CategoryId } from "@/types";

// ISR: article pages are static between hourly revalidations. Content rarely
// changes after ingestion, so an hour keeps them cheap and crawler-friendly.
export const revalidate = 3600;

// Next 16: route params arrive as a Promise and must be awaited.
type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

const SITE = "https://globevortex.com";

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return { title: "Article not found", robots: { index: false, follow: false } };
  }

  const url = `${SITE}/article/${article.id}`;
  const description = article.summary?.slice(0, 160) ?? article.title;
  const image = article.image_url || "/og-image.png";

  return {
    title: article.title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title: article.title,
      description,
      type: "article",
      publishedTime: article.published_at ?? article.created_at,
      url,
      images: [{ url: image, width: 1200, height: 630 }],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  const language = article.language === "fr" ? "fr" : "en";
  const url = `${SITE}/article/${article.id}`;
  const published = article.published_at ?? article.created_at;

  // Server-rendered once per revalidation, so a fixed UTC locale format is
  // deterministic — no client hydration to diverge from.
  const publishedLabel = new Date(published).toLocaleDateString(
    language === "fr" ? "fr-CA" : "en-US",
    { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" },
  );

  const t = {
    back: "GlobeVortex",
    readMore: language === "fr" ? "Lire l'article complet" : "Read full article",
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary ?? article.title,
    datePublished: published,
    dateModified: article.created_at,
    inLanguage: article.language,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: {
      "@type": "Organization",
      name: article.source || "GlobeVortex",
    },
    publisher: {
      "@type": "Organization",
      name: "GlobeVortex",
      url: SITE,
      logo: {
        "@type": "ImageObject",
        url: `${SITE}/logo.png`,
        width: 512,
        height: 512,
      },
    },
    image: {
      "@type": "ImageObject",
      url: article.image_url || `${SITE}/og-image.png`,
      width: 1200,
      height: 630,
    },
  };

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#C9A84C] transition-colors hover:text-[#E0C66A]"
        >
          <span aria-hidden>←</span> {t.back}
        </Link>

        <div className="mt-6">
          <span className="inline-block rounded-full border border-[#C9A84C] px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#C9A84C]">
            {categoryLabel(article.category as CategoryId, language)}
          </span>
        </div>

        <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
          {article.title}
        </h1>

        <p className="mt-3 text-sm text-gray-400">
          <span className="font-medium">{article.source}</span>
          <span aria-hidden> · </span>
          <time dateTime={published}>{publishedLabel}</time>
        </p>

        {article.summary && (
          <p className="mt-6 text-lg leading-relaxed text-gray-200">
            {article.summary}
          </p>
        )}

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#C9A84C] px-6 py-3 text-sm font-bold text-[#0A0A0F] transition-colors hover:bg-[#E0C66A]"
        >
          {t.readMore} <span aria-hidden>→</span>
        </a>
      </article>
    </main>
  );
}
