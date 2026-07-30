import { NextResponse } from "next/server";
import { getPostsForLocale } from "@/lib/posts";
import { buildSearchIndex } from "@/lib/search";

export const dynamic = "force-static";

/**
 * Phase 7：搜索索引端点（静态生成）。
 * 返回双语索引：{ en: SearchablePost[], zh: SearchablePost[] }
 * 客户端 SearchModal 懒加载此 JSON 后本地建 FlexSearch 索引。
 */
export async function GET() {
  const en = buildSearchIndex(getPostsForLocale("en"));
  const zh = buildSearchIndex(getPostsForLocale("zh"));

  return NextResponse.json(
    { en, zh },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    }
  );
}
