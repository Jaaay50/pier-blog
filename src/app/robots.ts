import { MetadataRoute } from "next";

/**
 * robots.txt（Phase 11D P1 防爬虫基线）。
 *
 * 原则：robots 只是「合作协议」，对不守规则的爬虫不构成防护。
 * 真实防护仍由参数白名单、缓存边界和边缘限流承接。
 *
 * - 不 Disallow /api/：搜索引擎需要实际抓取这些 URL，才能读取
 *   X-Robots-Tag: noindex。若 robots 先禁止抓取，noindex 不可见，URL 仍可能
 *   因外部信号进入搜索结果。
 * - 不 Disallow /og：社交预览爬虫（Twitterbot/Slackbot 等）遵守 robots，
 *   禁了会破坏分享卡片；滥用面已由 11B 参数白名单 + 11C 限流收口。
 * - 不 Disallow feed/sitemap：RSS 与 sitemap 本就是给机器读的入口；
 *   不进搜索结果由 X-Robots-Tag: noindex 表达（见 next.config.mjs）。
 * - 不做 User-Agent 黑名单：UA 可伪造，黑名单只挡自报家门的合规爬虫，
 *   属伪安全；对 AI 训练爬虫的取舍见安全计划 11D 章节。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://ethanpier.com/sitemap.xml",
  };
}
