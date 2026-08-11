import { NextResponse } from "next/server";
import { getPostsForLocale } from "@/lib/posts";
import { buildFeatureDocs, buildSearchIndex } from "@/lib/search";

export const dynamic = "force-static";

/**
 * 统一全站搜索索引端点（静态生成）。
 * 返回双语索引：{ en: SearchDoc[], zh: SearchDoc[] }，
 * 内容为功能页/主题页文档（buildFeatureDocs）+ 博客文档（buildSearchIndex）合并；
 * 客户端 SearchModal 懒加载此 JSON 后本地建 FlexSearch 索引并重排。
 */
export async function GET() {
  const en = [...buildFeatureDocs("en"), ...buildSearchIndex(getPostsForLocale("en"))];
  const zh = [...buildFeatureDocs("zh"), ...buildSearchIndex(getPostsForLocale("zh"))];

  return NextResponse.json(
    { en, zh },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    }
  );
}
