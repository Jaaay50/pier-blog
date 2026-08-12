import { describe, expect, it } from "vitest";
import nextConfig from "../next.config.mjs";

function parseDirectives(policy: string): Map<string, string> {
  return new Map(
    policy.split(";").map((directive) => {
      const normalized = directive.trim();
      const separator = normalized.indexOf(" ");
      return separator === -1
        ? [normalized, ""]
        : [normalized.slice(0, separator), normalized.slice(separator + 1)];
    }),
  );
}

describe("Next.js 安全响应头", () => {
  it("为全站设置基础安全头和强制 CSP", async () => {
    const rules = await nextConfig.headers?.();
    const globalRule = rules?.find((rule) => rule.source === "/:path*");
    expect(globalRule).toBeDefined();

    const headers = new Map(globalRule?.headers.map(({ key, value }) => [key, value]));
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(headers.has("Permissions-Policy")).toBe(true);
    expect(headers.has("Content-Security-Policy")).toBe(true);
    expect(headers.has("Content-Security-Policy-Report-Only")).toBe(false);
  });

  it("将 CSP 违规发送到同源收集端点", async () => {
    const rules = await nextConfig.headers?.();
    const globalRule = rules?.find((rule) => rule.source === "/:path*");
    const headers = new Map(globalRule?.headers.map(({ key, value }) => [key, value]));
    const policy = headers.get("Content-Security-Policy") ?? "";
    const directives = parseDirectives(policy);

    expect(headers.get("Reporting-Endpoints")).toBe(
      'csp-endpoint="https://ethanpier.com/api/csp-report"',
    );
    expect(directives.get("report-to")).toBe("csp-endpoint");
    expect(directives.get("report-uri")).toBe("/api/csp-report");
  });

  it("只允许当前产品实际使用的外部来源", async () => {
    const rules = await nextConfig.headers?.();
    const globalRule = rules?.find((rule) => rule.source === "/:path*");
    const headers = new Map(globalRule?.headers.map(({ key, value }) => [key, value]));
    const policy = headers.get("Content-Security-Policy") ?? "";
    const directives = parseDirectives(policy);

    expect(policy).not.toContain("unpkg.com");
    expect(directives.get("script-src")).toBe("'self' 'unsafe-inline' https://giscus.app");
    expect(directives.get("script-src-attr")).toBe("'none'");
    expect(directives.get("img-src")).toBe("'self' data: blob:");
    expect(directives.get("connect-src")).toBe("'self' https://currents-api.ethanpier.com");
    expect(directives.get("frame-src")).toBe("https://giscus.app");
    expect(directives.get("form-action")).toBe("'self'");
    expect(directives.get("object-src")).toBe("'none'");
  });
});

describe("防爬虫基线：X-Robots-Tag 边界（Phase 11D P1）", () => {
  /** 无索引价值的机器端点：只阻止进搜索结果，不阻止抓取/消费 */
  const EXPECTED_NOINDEX_SOURCES = [
    "/api/:path*",
    "/feed.xml",
    "/feed-zh.xml",
    "/sitemap.xml",
    "/sitemaps/:path*",
  ];

  it("机器端点带 X-Robots-Tag: noindex，且仅限这些路径", async () => {
    const rules = await nextConfig.headers?.();
    const noindexRules = (rules ?? []).filter((rule) =>
      rule.headers.some(({ key }) => key === "X-Robots-Tag"),
    );

    expect(noindexRules.map((rule) => rule.source).sort()).toEqual(
      [...EXPECTED_NOINDEX_SOURCES].sort(),
    );
    for (const rule of noindexRules) {
      const tag = rule.headers.find(({ key }) => key === "X-Robots-Tag");
      expect(tag?.value, rule.source).toBe("noindex");
    }
  });

  it("误伤检查：全局规则与页面路径绝不带 X-Robots-Tag", async () => {
    const rules = await nextConfig.headers?.();
    const globalRule = rules?.find((rule) => rule.source === "/:path*");
    expect(globalRule).toBeDefined();
    expect(globalRule?.headers.some(({ key }) => key === "X-Robots-Tag")).toBe(false);

    // 页面路由（locale 前缀）不得出现在任何 noindex 规则中
    for (const rule of rules ?? []) {
      if (!rule.headers.some(({ key }) => key === "X-Robots-Tag")) continue;
      expect(rule.source.startsWith("/api/") || /^\/(feed|sitemap)/.test(rule.source), rule.source).toBe(
        true,
      );
    }
  });

  it("社交预览保护：/og 不得被 noindex（否则分享卡破坏）", async () => {
    const rules = await nextConfig.headers?.();
    for (const rule of rules ?? []) {
      if (!rule.headers.some(({ key }) => key === "X-Robots-Tag")) continue;
      expect(rule.source.startsWith("/og"), `规则 ${rule.source} 不得覆盖 /og`).toBe(false);
    }
  });
});
