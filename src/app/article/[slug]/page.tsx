import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug, getRelatedArticles } from "@/lib/articles";
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
  const images = article.image_url
    ? [{ url: article.image_url, width: 1200, height: 630 }]
    : [{ url: `${SITE}/og-image.png`, width: 1200, height: 630 }];

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
      images,
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
  const categoryName = categoryLabel(article.category as CategoryId, language);

  const related = await getRelatedArticles(article.category, article.id, 4);

  // Server-rendered once per revalidation, so a fixed UTC locale format is
  // deterministic — no client hydration to diverge from.
  const publishedLabel = new Date(published).toLocaleDateString(
    language === "fr" ? "fr-CA" : "en-US",
    { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" },
  );

  const t = {
    back: "GlobeVortex",
    readMore: language === "fr" ? "Lire l'article complet" : "Read full article",
    more: language === "fr" ? `Plus en ${categoryName}` : `More ${categoryName}`,
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
    // Honest aggregation signal: this page is based on the original source
    // article, which Google can use to deduplicate against the publisher.
    isBasedOn: {
      "@type": "WebPage",
      url: article.url,
      name: article.title,
      publisher: {
        "@type": "Organization",
        name: article.source || "Unknown",
      },
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "GlobeVortex", item: SITE },
      { "@type": "ListItem", position: 2, name: categoryName, item: SITE },
      { "@type": "ListItem", position: 3, name: article.title },
    ],
  };

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
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
            {categoryName}
          </span>
        </div>

        {article.image_url && (
          <div className="relative mb-6 mt-4 aspect-video w-full max-w-3xl overflow-hidden rounded-lg">
            <Image
              src={article.image_url}
              alt={article.title}
              fill
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover"
              priority
            />
          </div>
        )}

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

        {related.length > 0 && (
          <section className="mt-12 border-t border-white/10 pt-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#C9A84C]">
              {t.more}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/article/${item.id}`}
                  className="group rounded-lg border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-[#C9A84C]"
                >
                  {item.image_url && (
                    <div className="relative mb-3 aspect-video w-full overflow-hidden rounded">
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <h3 className="line-clamp-2 text-sm font-medium text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">{item.source}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
