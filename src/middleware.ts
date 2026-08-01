import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "@/i18n/config";

/**
 * next-intl URL 路由中间件。
 * 访问 /  → 重定向到 /en（或按 Accept-Language 选 /zh）
 * 访问 /en/blog, /zh/blog → 直接命中，静态生成页面可缓存
 *
 * 切换语言后 URL 变化（/en → /zh），不需要读写 cookie，
 * Next.js 构建时能为每个 locale 静态生成独立页面。
 */
export default createMiddleware({
  locales,
  defaultLocale,
  // 所有 locale 都带前缀，包括默认语言
  // 如果想让 /en/... 直接用 /... 访问可改为 "as-needed"
  localePrefix: "always",
  // 允许从 cookie 读取用户上次选择的语言（平滑过渡）
  localeCookie: true,
});

export const config = {
  // 排除 API routes、静态文件、OG 图、RSS
  matcher: [
    "/((?!api|og|feed.xml|feed-zh.xml|sitemap.xml|robots.txt|_next|.*\\..*).*)",
  ],
};
