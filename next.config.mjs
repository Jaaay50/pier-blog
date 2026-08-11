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

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx"],

  async headers() {
    return [
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
