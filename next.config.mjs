import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const cspReportPath = "/api/csp-report";
const cspReportEndpoint = `https://ethanpier.com${cspReportPath}`;
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://giscus.app",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://currents-api.ethanpier.com",
  "frame-src https://giscus.app",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  `report-to csp-endpoint`,
  `report-uri ${cspReportPath}`,
].join("; ");

/**
 * Phase 11D P1: 无索引价值的机器端点统一 X-Robots-Tag: noindex。
 * - 只阻止进入搜索结果，不阻止抓取与消费：RSS 阅读器 / sitemap 解析 /
 *   SearchModal 客户端 fetch 均不读该头，行为不变。
 * - /og 明确不在此列：Twitterbot、Slackbot 等社交预览爬虫遵守 robots 协议，
 *   社交卡与富结果依赖 /og 可抓取；其滥用面已由参数白名单（11B P1）
 *   与边缘限流（11C P1）收口。
 * - 页面路由（/:locale/...）绝不 noindex，见 security-headers.test.ts 误伤检查。
 */
const NOINDEX_SOURCES = ["/api/:path*", "/feed.xml", "/feed-zh.xml", "/sitemap.xml", "/sitemaps/:path*"];

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx"],

  async headers() {
    return [
      ...NOINDEX_SOURCES.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      })),
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Reporting-Endpoints",
            value: `csp-endpoint="${cspReportEndpoint}"`,
          },
          // 先以兼容现有 Next 内联脚本/样式的基线强制执行，并同步收集违规报告。
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/showcase",
        destination: "/portfolio",
        permanent: true,
      },
      // Renamed post: drop the misleading year from the slug
      {
        source: "/:locale(en|zh)/blog/state-management-in-2024",
        destination: "/:locale/blog/state-management-in-the-rsc-era",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
