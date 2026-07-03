// Shared dedup primitives used by the ingestion cron (fetch-news) and the
// X-posting cron (post-to-x). Two layers:
//   1. canonicalizeUrl — normalizes URLs so trivially-different links to the
//      same resource collapse onto one dedup key.
//   2. titleSimilarity / findNearDuplicate — catches the case URL dedup can't:
//      the same real-world story reported by different outlets (or the same
//      story re-served by Google News under a fresh, unresolvable redirect
//      token — see canonicalizeUrl's Google News branch for why that host
//      can't be resolved to the underlying publisher URL server-side).

const TRACKING_PARAM_NAMES = new Set([
  "ref",
  "ref_src",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "spm",
  "cmpid",
  "ito",
  "intcid",
  "cmp",
  "at_medium",
  "at_campaign",
  "igshid",
  "guccounter",
]);

function isTrackingParam(name: string): boolean {
  return name.toLowerCase().startsWith("utm_") || TRACKING_PARAM_NAMES.has(name.toLowerCase());
}

// news.google.com/rss/articles/<token> links carry an opaque, encrypted
// token (verified by decoding one: it's ~193 bytes of non-UTF8 binary, not
// base64(url)) that resolves to the real publisher URL only via a
// client-side JS call to Google's internal batchexecute endpoint — an extra
// network round-trip per article we can't afford at 50+ sources / 15-minute
// cron cadence. So for this host we can't canonicalize to the underlying
// publisher URL; we just strip the volatile `oc` query param so the key is
// stable across parses of the same feed response. Actual cross-fetch
// instability for this host is handled by the title-similarity layer below.
const GOOGLE_NEWS_HOST = "news.google.com";

export function canonicalizeUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl.trim().toLowerCase();
  }

  parsed.protocol = "https:";
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.hash = "";

  if (parsed.hostname === GOOGLE_NEWS_HOST) {
    parsed.search = "";
  } else {
    const params = Array.from(parsed.searchParams.entries()).filter(
      ([name]) => !isTrackingParam(name),
    );
    parsed.search = "";
    for (const [name, value] of params) parsed.searchParams.append(name, value);
  }

  let result = parsed.toString();
  if (result.endsWith("/") && parsed.pathname !== "/") {
    result = result.slice(0, -1);
  }
  return result;
}

// ── Title-similarity near-duplicate detection ──────────────────────────────
// Token-set Jaccard similarity on normalized titles. Cheap (no API cost),
// language-agnostic enough for FR/EN since we only compare within the same
// language, and robust to word-order/paraphrasing differences between
// outlets covering the same event.

const STOPWORDS_EN = new Set([
  "a", "an", "the", "of", "in", "on", "at", "to", "for", "and", "or", "is",
  "are", "was", "were", "with", "by", "as", "it", "its", "after", "over",
  "amid", "amid", "into", "from", "says", "say",
]);
const STOPWORDS_FR = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "est",
  "sont", "au", "aux", "en", "dans", "sur", "pour", "par", "avec", "que",
  "qui", "se", "sa", "son", "ses", "après", "selon", "vers",
]);

function normalizeTitle(title: string, language: "en" | "fr"): Set<string> {
  const stopwords = language === "fr" ? STOPWORDS_FR : STOPWORDS_EN;
  const tokens = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents so café/cafe compare equal
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !stopwords.has(t));
  return new Set(tokens);
}

export function titleSimilarity(a: string, b: string, language: "en" | "fr"): number {
  const setA = normalizeTitle(a, language);
  const setB = normalizeTitle(b, language);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Thresholds chosen empirically against real recent article titles pulled
// from the live `articles` table (see scripts/check-near-duplicates.mjs,
// local-only, not committed — run it again if these ever need re-tuning).
//
// A single cutoff doesn't work on this data: World Cup coverage floods the
// corpus with formulaic phrases ("World Cup", "Round of 16", "knockout
// game"), so scores in the 0.25-0.55 range contain a genuine mix of true
// duplicates ("Portugal through to last 16 after dramatic victory over
// Croatia" vs "Portugal claim dramatic win over Croatia to reach World Cup
// last 16", 0.417) and false positives from shared boilerplate alone
// ("Switzerland vs Algeria live updates" vs "Portugal vs Croatia live
// score", 0.304 — different matches entirely). Above ~0.55 every sampled
// pair was a genuine duplicate; below ~0.25 the corpus was overwhelmingly
// unrelated. So the contested middle band gets a single cheap Haiku
// same-story check instead of a guess.
export const NEAR_DUP_AUTO_DROP = 0.55; // score >= this: certain duplicate, no Haiku call
export const NEAR_DUP_AUTO_KEEP = 0.25; // score < this: certain non-duplicate, no Haiku call

export interface TitledCandidate {
  title: string;
  publishedAt: string;
}

export interface BestMatch<T> {
  item: T;
  score: number;
}

// Highest-scoring existing article (at or above NEAR_DUP_AUTO_KEEP) for
// `candidateTitle`, or null if nothing scores that high. Callers should
// pre-filter `existing` to the same language and a recent time window (e.g.
// last 36h) before calling this, to keep the O(n) scan cheap and avoid
// flagging unrelated old stories that happen to share vocabulary.
export function findBestMatch<T extends TitledCandidate>(
  candidateTitle: string,
  existing: T[],
  language: "en" | "fr",
): BestMatch<T> | null {
  let best: BestMatch<T> | null = null;
  for (const item of existing) {
    const score = titleSimilarity(candidateTitle, item.title, language);
    if (score >= NEAR_DUP_AUTO_KEEP && (!best || score > best.score)) {
      best = { item, score };
    }
  }
  return best;
}
