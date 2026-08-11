import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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
          // CSP Report-Only 模式：先观察违规，不阻断
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://giscus.app https://unpkg.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://giscus.app https://currents-api.ethanpier.com",
              "frame-src 'self' https://giscus.app",
              "base-uri 'self'",
              "form-action 'self' https://currents-api.ethanpier.com",
              "frame-ancestors 'self'",
              "object-src 'none'",
            ].join("; "),
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
