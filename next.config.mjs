import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx"],
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
