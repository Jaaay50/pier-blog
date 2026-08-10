import { buildStaticShardEntries, buildUrlsetXml } from "@/lib/sitemap";

/**
 * /sitemaps/static.xml — 静态页 + Currents 主题页 + 博客文章分片。
 * 构建期生成（数据全部来自本地文件），零后端依赖、零运行时文件系统读取；
 * 字面路由优先于 /sitemaps/[shard] 动态段。
 */
export const dynamic = "force-static";

export async function GET() {
  return new Response(buildUrlsetXml(buildStaticShardEntries()), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
