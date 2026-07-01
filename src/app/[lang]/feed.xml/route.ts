import { getRecentArticlesForFeed } from "@/lib/articles";
import type { Language } from "@/types";

// Per-locale RSS 2.0 feed for Google Discover's "Follow" feature. Each locale
// gets its own feed (/en/feed.xml, /fr/feed.xml) scoped to that language's
// articles, with item links pointing at the locale-prefixed article URLs. The
// old combined /feed.xml 301-redirects here (to /en) via the proxy. ISR-style
// caching: revalidates every 15 minutes to match the fetch-news cron cadence.
export const revalidate = 900;

const SITE = "https://globevortex.com";
const FEED_LIMIT = 50;

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "fr" }];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const language: Language = lang === "fr" ? "fr" : "en";
  const channelLang = language === "fr" ? "fr-ca" : "en-us";
  const channelTitle = language === "fr" ? "GlobeVortex — Actualités" : "GlobeVortex";
  const channelDesc =
    language === "fr" ? "Actualités mondiales propulsées par l'IA" : "World news powered by AI";

  const articles = await getRecentArticlesForFeed(FEED_LIMIT, language);

  const items = articles
    .map((article) => {
      const link = `${SITE}/${language}/article/${article.id}`;
      const pubDate = new Date(article.created_at).toUTCString();
      const description = article.summary ?? article.title;
      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${link}</link>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${link}</guid>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${SITE}/${language}</link>
    <description>${escapeXml(channelDesc)}</description>
    <language>${channelLang}</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=300",
    },
  });
}
