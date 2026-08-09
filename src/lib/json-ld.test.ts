import { describe, it, expect } from "vitest";
import { safeJsonLd } from "./json-ld";

/** 恶意字符串：外部 RSS 标题/作者/摘要中真实可能出现的逃逸载荷。 */
const MALICIOUS = [
  '</script><script>alert(document.cookie)</script>',
  '</SCRIPT><img src=x onerror=alert(1)>',
  '<!--<script>alert(1)</script>-->',
  '<script>alert(1)</script>',
  '"><svg onload=alert(1)>',
  '&lt;/script&gt;',
  'a\u2028b\u2029c', // U+2028 / U+2029 行分隔符
  '</script>',
];

describe("safeJsonLd", () => {
  it("结果是合法 JSON 且可被 JSON.parse 还原", () => {
    for (const m of MALICIOUS) {
      const out = safeJsonLd({ headline: m, author: { name: m } });
      const parsed = JSON.parse(out) as { headline: string; author: { name: string } };
      expect(parsed.headline).toBe(m);
      expect(parsed.author.name).toBe(m);
    }
  });

  it("不含任何可闭合 script 的原始字符序列", () => {
    for (const m of MALICIOUS) {
      const out = safeJsonLd({ headline: m, description: m });
      expect(out).not.toContain("</script>");
      expect(out.toLowerCase()).not.toContain("</script");
      expect(out).not.toContain("<script");
      expect(out).not.toContain("<!--");
      // 任何原始 < > & 都不允许出现（必须被 unicode 转义）
      expect(out).not.toMatch(/<(?!\/)/);
      expect(out).not.toContain(">");
      expect(out).not.toContain("&");
      // 原始 U+2028/U+2029 不得出现
      expect(out).not.toContain("\u2028");
      expect(out).not.toContain("\u2029");
    }
  });

  it("嵌套对象、数组、unicode、emoji 均安全", () => {
    const out = safeJsonLd({
      "@context": "https://schema.org",
      headline: "GPT-6 </script><script>alert(1)</script> 发布 🚀",
      tags: ["<b>AI</b>", "模型 & 推理"],
      author: { name: "O'Brien <script>" },
    });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out)).toBeTruthy();
    expect(out).toContain("\\u003c");
  });

  it("与 JSON.stringify 对无恶意内容输出一致（无过度转义破坏可读性）", () => {
    const clean = { headline: "OpenAI launches GPT-6", count: 42, ok: true };
    expect(safeJsonLd(clean)).toBe(JSON.stringify(clean));
  });
});
