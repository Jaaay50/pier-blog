import { buildRssFeed } from "@/lib/rss";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildRssFeed("zh"), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
