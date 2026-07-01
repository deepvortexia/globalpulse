import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next 16 renamed the `middleware` convention to `proxy` (middleware is
// deprecated). This runs before routing to implement path-based locale routing:
// bare/legacy URLs are redirected into a locale prefix, and a couple of
// root-level files that used to be their own routes are served here instead.

const LOCALES = ["en", "fr"] as const;
type Locale = (typeof LOCALES)[number];
const DEFAULT_LOCALE: Locale = "en";

// Pre-migration indexed pages with a single stable counterpart. These get a
// permanent (301) redirect to the default-locale version to consolidate SEO
// equity onto the new URL. A 301 is cached, so its target must be fixed — it
// can't depend on Accept-Language (that's why `/` stays a per-user 307 below).
const LEGACY_PAGES = new Set(["/about", "/privacy", "/terms"]);

// Minimal Accept-Language negotiation. With only two locales a full
// negotiator/intl-localematcher dependency isn't worth it: we walk the
// quality-ordered language tags and return the first that is (or starts with)
// a supported locale, defaulting to English. `fr-CA`, `fr`, `FR` all match fr.
function getLocale(request: NextRequest): Locale {
  const header = request.headers.get("accept-language");
  if (!header) return DEFAULT_LOCALE;

  const tags = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    const base = tag.split("-")[0];
    if (LOCALES.includes(base as Locale)) return base as Locale;
  }
  return DEFAULT_LOCALE;
}

function hasLocalePrefix(pathname: string): boolean {
  return LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // 1. Already locale-prefixed (`/en`, `/fr/about`, `/fr/feed.xml`, …) → render.
  if (hasLocalePrefix(pathname)) return NextResponse.next();

  // 2. Legacy article URLs keep working: let the resolver route handler at
  //    /article/[slug] look up the article's language and 301 to the correct
  //    locale. The proxy must NOT blind-redirect these to /en.
  if (pathname.startsWith("/article/")) return NextResponse.next();

  // 3. IndexNow key verification file (served here now that the old root
  //    [filename] route is gone — it collided with the new [lang] segment).
  const indexNowKey = process.env.INDEXNOW_KEY;
  if (indexNowKey && pathname === `/${indexNowKey}.txt`) {
    return new NextResponse(indexNowKey, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 4. Old combined feed → permanent redirect to the English per-locale feed so
  //    existing Discover "Follow" subscribers keep working.
  if (pathname === "/feed.xml") {
    return NextResponse.redirect(new URL("/en/feed.xml", request.url), 301);
  }

  // 5. Public static assets (/logo.png, /og-image.png, /site.webmanifest,
  //    /llms.txt, /favicon-32x32.png, …) and metadata files (/robots.txt,
  //    /sitemap.xml) live at the root and always carry a file extension in the
  //    final path segment. Pass them through untouched so they aren't swept into
  //    the locale redirect below (that regression broke the header logo). This
  //    MUST sit after the IndexNow key check — that file is also a `.txt` but
  //    needs custom serving above.
  if (pathname.slice(pathname.lastIndexOf("/") + 1).includes(".")) {
    return NextResponse.next();
  }

  // 6. Legacy static pages → 301 permanent to the default-locale version. The
  //    locale-routing structure is verified stable, so we consolidate these
  //    indexed URLs onto /en/… permanently (French readers use the in-page
  //    locale-switch link). Fixed target because a 301 is cached.
  if (LEGACY_PAGES.has(pathname)) {
    return NextResponse.redirect(
      new URL(`/${DEFAULT_LOCALE}${pathname}`, request.url),
      301,
    );
  }

  // 7. Everything else (home `/` and any other bare path) → detect locale and
  //    307-redirect into it. 307 (not 301) because the right locale varies per
  //    user and must never be cached as a permanent mapping.
  const locale = getLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url, 307);
}

export const config = {
  // Run on everything except Next internals, API routes, and the metadata files
  // that have their own handlers (robots.txt, sitemap.xml) or are static assets
  // (favicon.ico). Note: this deliberately does NOT exclude arbitrary .txt, so
  // the dynamically-named IndexNow key file still reaches the proxy above.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
