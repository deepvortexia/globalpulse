// IndexNow protocol (indexnow.org) — pushes new article URLs to Bing,
// Yandex, Seznam, and Naver so they can crawl them immediately instead of
// waiting on their normal discovery schedule.
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const HOST = "globevortex.com";
// IndexNow accepts up to 10,000 URLs per request; keep batches well under
// that so a single slow/failed request never risks a huge payload.
const BATCH_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

// Fire-and-forget notification. Never throws — a failure here must not break
// the news-fetch cron that calls it.
export async function submitToIndexNow(urls: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  if (!key || urls.length === 0) return;

  const keyLocation = `https://${HOST}/${key}.txt`;

  for (const batch of chunk(urls, BATCH_SIZE)) {
    try {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host: HOST, key, keyLocation, urlList: batch }),
      });
      if (!res.ok) {
        console.error(`[indexnow] Submission failed: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      console.error("[indexnow] Submission request failed:", error);
    }
  }
}
