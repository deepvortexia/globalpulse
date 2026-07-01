import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/articles";

// Legacy resolver for pre-locale article URLs (globevortex.com/article/{id}).
// These were indexed before the /en /fr migration. We look up the article's own
// language and 301-redirect to its locale-prefixed URL (/{lang}/article/{id}),
// preserving SEO equity for any still-live article. Purged/invalid ids 404,
// matching the prior behaviour of the old article page.
//
// The proxy passes /article/* through untouched precisely so this handler can do
// the DB-backed language lookup the proxy can't.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  const lang = article.language === "fr" ? "fr" : "en";
  // 301 (permanent): the old flat URL has a single, stable locale home. Build
  // the response by hand because next/navigation's redirect() only emits 307.
  const target = new URL(`/${lang}/article/${slug}`, req.url);
  return Response.redirect(target, 301);
}
