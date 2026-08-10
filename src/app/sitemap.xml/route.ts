import { buildSitemapIndexXml, SITE_URL, SITEMAP_SHARD_NAMES } from "@/lib/sitemap";

/**
 * /sitemap.xml — 静态 sitemap index，零后端依赖。
 * 实际 URL 在 /sitemaps/* 分片中；任何一片的后端故障都不影响 index 与其余分片。
 */
export const dynamic = "force-static";

export async function GET() {
  const xml = buildSitemapIndexXml(SITEMAP_SHARD_NAMES.map((name) => `${SITE_URL}/sitemaps/${name}`));
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
