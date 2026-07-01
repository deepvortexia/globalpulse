// The feed split into per-locale feeds (/en/feed.xml, /fr/feed.xml). This old
// combined URL 301-redirects to the English feed so existing Google Discover
// "Follow" subscribers keep working. The proxy also short-circuits /feed.xml to
// the same target; this handler is the guaranteed fallback if a request ever
// reaches routing without passing the proxy.
export function GET(req: Request) {
  return Response.redirect(new URL("/en/feed.xml", req.url), 301);
}
