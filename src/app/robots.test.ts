import { describe, expect, it } from "vitest";
import robots from "./robots";

/**
 * robots.txt 防爬虫基线（Phase 11D P1）。
 * robots 是合作协议不是防护；这里锁定的是「不误伤」边界：
 * 搜索引擎、RSS、社交预览、sitemap 抓取必须保持放行。
 */
describe("robots.txt 规则", () => {
  const result = robots();
  const rules = Array.isArray(result.rules) ? result.rules : [result.rules];

  it("对所有 UA 放行站点主体", () => {
    expect(rules).toHaveLength(1);
    expect(rules[0]?.userAgent).toBe("*");
    expect(rules[0]?.allow).toBe("/");
  });

  it("不阻止搜索引擎抓取 noindex 端点", () => {
    expect(rules[0]?.disallow).toBeUndefined();
  });

  it("误伤检查：不得 Disallow noindex 端点、社交预览、RSS、sitemap 或页面路径", () => {
    const disallow = rules[0]?.disallow;
    const disallowList = (Array.isArray(disallow) ? disallow : [disallow]).filter(
      (value): value is string => typeof value === "string",
    );
    for (const path of ["/api/search-index", "/og", "/feed", "/sitemap", "/en", "/zh", "/blog", "/currents"]) {
      for (const entry of disallowList) {
        expect(path.startsWith(entry), `Disallow ${entry} 误伤 ${path}`).toBe(false);
      }
    }
  });

  it("声明真实 sitemap index 地址", () => {
    expect(result.sitemap).toBe("https://ethanpier.com/sitemap.xml");
  });

  it("不做 User-Agent 黑名单（UA 可伪造，黑名单属伪安全）", () => {
    // 单一通配规则即隐含此约束；显式断言防止未来加回 UA 黑名单
    expect(rules.every((rule) => rule.userAgent === "*")).toBe(true);
  });
});
