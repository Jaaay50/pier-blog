import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown";

/**
 * Phase 11A Markdown 注入安全测试。
 *
 * renderMarkdown 是 Currents deepRead/翻译的唯一渲染入口（服务端 ISR + 客户端阅读层共用）。
 * 即使后台 LLM 管线被投毒，输出也不得含可执行内容。
 */
describe("renderMarkdown 安全清洗", () => {
  describe("脚本注入", () => {
    it("剥离 <script> 标签及其内容", async () => {
      const html = await renderMarkdown('before\n\n<script>alert("xss")</script>\n\nafter');
      expect(html).not.toContain("<script");
      expect(html).not.toContain("alert");
      expect(html).toContain("before");
      expect(html).toContain("after");
    });

    it("剥离大小写混淆的 <ScRiPt>", async () => {
      const html = await renderMarkdown('<ScRiPt>alert(1)</sCrIpT>');
      expect(html.toLowerCase()).not.toContain("<script");
      expect(html).not.toContain("alert(1)");
    });

    it("移除事件处理属性 onerror/onclick/onload", async () => {
      const html = await renderMarkdown(
        '<img src="x" onerror="alert(1)"> <a href="https://a.com" onclick="alert(2)">x</a> <body onload="alert(3)">',
      );
      expect(html).not.toContain("onerror");
      expect(html).not.toContain("onclick");
      expect(html).not.toContain("onload");
      expect(html).not.toContain("alert");
    });

    it("剥离 <style> 标签及其内容", async () => {
      const html = await renderMarkdown('<style>body{background:url("javascript:alert(1)")}</style>');
      expect(html).not.toContain("<style");
      expect(html).not.toContain("background");
    });

    it("剥离 iframe/object/embed/form", async () => {
      const html = await renderMarkdown(
        '<iframe src="https://evil.com"></iframe><object data="x"></object><embed src="x"><form action="https://evil.com"><input name="a"></form>',
      );
      expect(html).not.toContain("<iframe");
      expect(html).not.toContain("<object");
      expect(html).not.toContain("<embed");
      expect(html).not.toContain("<form");
      expect(html).not.toContain("<input");
    });
  });

  describe("SVG / MathML 注入", () => {
    it("剥离内联 SVG（含 onload 与 foreignObject）", async () => {
      const html = await renderMarkdown(
        '<svg onload="alert(1)"><foreignObject><body onload="alert(2)"></body></foreignObject></svg>',
      );
      expect(html).not.toContain("<svg");
      expect(html).not.toContain("foreignObject");
      expect(html).not.toContain("alert");
    });

    it("剥离 MathML 注入向量", async () => {
      const html = await renderMarkdown('<math><maction actiontype="statusline#https://evil.com">x</maction></math>');
      expect(html).not.toContain("<math");
      expect(html).not.toContain("maction");
    });
  });

  describe("危险链接协议", () => {
    it("拒绝 javascript: 协议", async () => {
      const html = await renderMarkdown('[click](javascript:alert(1))');
      expect(html).not.toContain("javascript:");
      // 链接文字保留但 href 被移除
      expect(html).toContain("click");
    });

    it("拒绝大小写混淆 JaVaScRiPt:", async () => {
      const html = await renderMarkdown('[x](JaVaScRiPt:alert(1))');
      expect(html.toLowerCase()).not.toContain("javascript:");
    });

    it("拒绝带空白/换行/控制字符混淆的 javascript:（原文本不形成链接）", async () => {
      // Markdown 层面 tab/换行/URL编码不解析为链接，原样输出
      const vectors = [
        "[a](java\tscript:alert(1))",
        "[b](java\nscript:alert(1))",
        "[c](%20javascript:alert(1))",
        "[d](&#106;avascript:alert(1))",
      ];
      for (const v of vectors) {
        const html = await renderMarkdown(v);
        // 这些不会被 Markdown 识别为 <a> 链接，原样渲染成文本；但不用于任何 href
        expect(html).not.toMatch(/<a\s[^>]*href/i);
      }
    });

    it("拒绝 data:text/html 协议", async () => {
      const html = await renderMarkdown('[x](data:text/html,<script>alert(1)</script>)');
      expect(html).not.toContain("data:text/html");
    });

    it("拒绝 vbscript: 协议", async () => {
      const html = await renderMarkdown('[x](vbscript:msgbox(1))');
      expect(html).not.toContain("vbscript:");
    });

    it("允许 http/https/mailto 与相对路径、# 锚点", async () => {
      const html = await renderMarkdown(
        "[a](https://example.com) [b](http://example.com) [c](mailto:hi@example.com) [d](/currents/123) [e](#section)",
      );
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('href="http://example.com"');
      expect(html).toContain('href="mailto:hi@example.com"');
      expect(html).toContain('href="/currents/123"');
      expect(html).toContain('href="#section"');
    });

    it("协议相对 URL（//evil.com）按相对路径放行但不含危险协议", async () => {
      const html = await renderMarkdown("[x](//example.com/path)");
      // 协议相对 URL 无协议前缀，不在 javascript:/data: 危险面内
      expect(html).not.toContain("javascript:");
      expect(html).not.toContain("data:");
    });
  });

  describe("危险属性", () => {
    it("移除 style 内联样式", async () => {
      const html = await renderMarkdown('<p style="background:url(javascript:alert(1))">x</p>');
      expect(html).not.toContain("style=");
    });

    it("移除 id 与任意 data-* 属性（防 DOM clobbering）", async () => {
      const html = await renderMarkdown('<p id="__proto__" data-evil="1">x</p>');
      expect(html).not.toContain("id=");
      expect(html).not.toContain("data-evil");
    });

    it("code 只保留 language- 前缀 className", async () => {
      const md = "```js\nconst a = 1;\n```";
      const html = await renderMarkdown(md);
      expect(html).toContain("language-js");
    });
  });

  describe("HTML 注释与 doctype", () => {
    it("移除 HTML 注释（防 IE 条件注释与解析歧义）", async () => {
      const html = await renderMarkdown("before <!-- <script>alert(1)</script> --> after");
      expect(html).not.toContain("<!--");
      expect(html).not.toContain("alert");
    });
  });

  describe("正常 Markdown 无回归", () => {
    it("渲染中英文段落/标题/列表/引用/代码/链接/表格", async () => {
      const md = [
        "# 标题一",
        "",
        "正常中文段落，与 English mixed text。",
        "",
        "## Heading Two",
        "",
        "- 列表项一",
        "- List item two",
        "",
        "1. 有序一",
        "2. Ordered two",
        "",
        "> 引用块 blockquote",
        "",
        "`inline code` 与代码块：",
        "",
        "```ts",
        "const x: number = 42;",
        "```",
        "",
        "[链接](https://example.com) 与 **加粗** 和 *斜体* 和 ~~删除线~~。",
        "",
        "| 表头 A | Header B |",
        "| --- | --- |",
        "| 单元格 | cell |",
      ].join("\n");
      const html = await renderMarkdown(md);
      expect(html).toContain("<h1>标题一</h1>");
      expect(html).toContain("<h2>Heading Two</h2>");
      expect(html).toContain("<ul>");
      expect(html).toContain("<ol>");
      expect(html).toContain("<blockquote>");
      expect(html).toContain("<code>inline code</code>");
      expect(html).toContain("language-ts");
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain("<strong>加粗</strong>");
      expect(html).toContain("<em>斜体</em>");
      expect(html).toContain("<del>删除线</del>");
      expect(html).toContain("<table>");
      expect(html).toContain("<th>表头 A</th>");
      expect(html).toContain("<td>单元格</td>");
    });

    it("GFM 任务列表降级安全（checkbox input 被剥离，文本保留）", async () => {
      const html = await renderMarkdown("- [x] done item\n- [ ] todo item");
      expect(html).not.toContain("<input");
      expect(html).toContain("done item");
      expect(html).toContain("todo item");
    });

    it("硬换行与水平线保留", async () => {
      const html = await renderMarkdown("line one  \nline two\n\n---\n\nafter hr");
      expect(html).toContain("<br>");
      expect(html).toContain("<hr>");
    });
  });
});
