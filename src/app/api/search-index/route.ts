import { NextResponse } from "next/server";
import { getPostsForLocale } from "@/lib/posts";
import { buildFeatureDocs, buildModelDocs, buildSearchIndex } from "@/lib/search";
import { fetchDiscoverableModels } from "@/lib/currents/models-discovery";
import type { DiscoverableModel } from "@/lib/currents/models-discovery";

export const revalidate = 3600;

/**
 * 统一全站搜索索引端点（小时级再验证）。
 * 返回双语索引：{ en: SearchDoc[], zh: SearchDoc[] }，
 * 内容为功能页/主题页、后端模型注册表与博客文档合并；模型发现故障时保留完整静态索引并 no-store。
 * 客户端 SearchModal 懒加载此 JSON 后本地建 FlexSearch 索引并重排。
 */
export async function GET() {
  let models: DiscoverableModel[] = [];
  let degraded = false;
  try {
    models = await fetchDiscoverableModels();
  } catch {
    degraded = true;
  }
  const en = [...buildFeatureDocs("en"), ...buildModelDocs("en", models), ...buildSearchIndex(getPostsForLocale("en"))];
  const zh = [...buildFeatureDocs("zh"), ...buildModelDocs("zh", models), ...buildSearchIndex(getPostsForLocale("zh"))];

  return NextResponse.json(
    { en, zh },
    {
      headers: {
        "Cache-Control": degraded ? "no-store" : "public, max-age=3600, stale-while-revalidate=86400",
        "X-Search-Index-Degraded": degraded ? "models" : "none",
      },
    }
  );
}
