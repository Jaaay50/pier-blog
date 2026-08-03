import { notFound } from "next/navigation";

/**
 * next-intl URL 路由方案的 404 捕获：
 * /zh/任意未匹配路径 → 命中此 catch-all → notFound() → 渲染同 segment 的 not-found.tsx。
 * 这样自定义 404 页能拿到 [locale] 布局（Navbar/Footer/next-intl provider）。
 */

// 保持全静态架构：不在构建时预生成任意路径，运行时命中即走 notFound 静态页
export const dynamic = "force-static";
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export default function CatchAllPage() {
  notFound();
}
