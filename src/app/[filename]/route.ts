// IndexNow key verification file, served at the site root:
// https://globevortex.com/{INDEXNOW_KEY}.txt — the search engine fetches
// this to confirm we control the domain before accepting submissions.
// A single dynamic segment is the only way to serve a filename-as-a-secret
// at the root in App Router; every other path segment (about/, api/,
// article/, etc.) is a static route and takes precedence over this one.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const key = process.env.INDEXNOW_KEY;
  const { filename } = await params;

  if (!key || filename !== `${key}.txt`) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(key, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
