import { getRecentArticlesForFeed } from "@/lib/articles";

// RSS 2.0 feed for Google Discover's "Follow" feature. Combines both languages
// into one feed (see route comment below for why). ISR-style caching, not
// force-dynamic: revalidates every 15 minutes to match the fetch-news cron
// cadence (.github/workflows/fetch-news.yml), so this doesn't hit Supabase on
// every crawl.
export const revalidate = 900;

const SITE = "https://globevortex.com";
const FEED_LIMIT = 50;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const articles = await getRecentArticlesForFeed(FEED_LIMIT);

  const items = articles
    .map((article) => {
      const link = `${SITE}/article/${article.id}`;
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
    <title>GlobeVortex</title>
    <link>${SITE}</link>
    <description>World news powered by AI</description>
    <language>en-us</language>
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
