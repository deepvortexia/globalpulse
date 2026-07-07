import { getArticlesForNewsSitemap } from "@/lib/articles";
import { escapeXml } from "@/lib/xml";

// Google News Sitemap (https://www.google.com/schemas/sitemap-news/0.9) — a
// discovery channel distinct from the regular sitemap.xml (see src/app/sitemap.ts),
// specifically for fresh content and Google News/Top Stories crawling. Combined
// across both locales in one file (news:language is set per-<url>, so there's
// no need for per-locale files like feed.xml has). Revalidates every 15 minutes
// to match the fetch-news cron cadence, same as feed.xml.
export const revalidate = 900;

const SITE = "https://globevortex.com";

export async function GET() {
  const articles = await getArticlesForNewsSitemap();

  const urls = articles
    .filter((article) => article.published_at && !Number.isNaN(Date.parse(article.published_at)))
    .map((article) => {
      const lang = article.language === "fr" ? "fr" : "en";
      const loc = `${SITE}/${lang}/article/${article.id}`;
      // published_at is the article's own publish date, not our ingestion time
      // (created_at) — that's what news:publication_date is meant to convey.
      // Non-null here: filtered above (the `.gte` query clause already
      // excludes nulls, but this stays defensive against a bad timestamp).
      const publicationDate = new Date(article.published_at as string).toISOString();
      return `  <url>
    <loc>${loc}</loc>
    <news:news>
      <news:publication>
        <news:name>GlobeVortex</news:name>
        <news:language>${lang}</news:language>
      </news:publication>
      <news:publication_date>${publicationDate}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=300",
    },
  });
}
