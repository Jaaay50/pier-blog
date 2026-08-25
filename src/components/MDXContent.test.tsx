import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { compileMDXWithHeadings } from "@/components/MDXContent";

/**
 * 博客 MDX 渲染管线回归。
 *
 * 与潮汐 Markdown 是两条独立管线（MDX 编译 vs remark→rehype 字符串），
 * 这里锁住二者在「加粗/斜体/列表/引用/代码/表格」上的行为一致性，
 * 避免只修好其中一条。
 */
async function render(source: string): Promise<string> {
  const { content } = await compileMDXWithHeadings(source);
  return renderToStaticMarkup(content);
}

describe("compileMDXWithHeadings", () => {
  describe("CJK 强调闭合（与潮汐管线一致）", () => {
    it("全角标点后紧跟汉字仍正确加粗", async () => {
      const html = await render("**来源事实：**报道称已开始洽谈。");
      expect(html).toContain("<strong>来源事实：</strong>");
      expect(html).not.toContain("**");
    });

    it("斜体与删除线同样补正", async () => {
      expect(await render("*重点：*说明")).toContain("<em>重点：</em>");
      expect(await render("~~废弃：~~新版")).toContain("<del>废弃：</del>");
    });

    it("围栏代码块内的星号不被误改", async () => {
      const html = await render("```js\nconst a = 2 ** 3;\n```");
      expect(html).not.toContain("<strong>");
      expect(html).toContain("**");
    });
  });

  describe("GFM 支持", () => {
    it("表格渲染为 table 而非字面量文本", async () => {
      const html = await render(
        ["| 指标 | 目标 |", "| --- | --- |", "| LCP | < 2.5s |"].join("\n"),
      );
      expect(html).toContain("<table>");
      expect(html).toContain("<th>指标</th>");
      expect(html).toContain("<td>LCP</td>");
      expect(html).not.toContain("| 指标 |");
    });

    it("删除线语法生效", async () => {
      expect(await render("~~deprecated~~")).toContain("<del>deprecated</del>");
    });
  });

  describe("基础块级元素", () => {
    it("列表、引用、行内代码正常渲染", async () => {
      const html = await render(
        ["- 第一项", "- 第二项", "", "> 引用内容", "", "`inline code`"].join("\n"),
      );
      expect(html).toContain("<ul>");
      expect(html).toContain("<li>第一项</li>");
      expect(html).toContain("<blockquote>");
      expect(html).toContain("<code>inline code</code>");
    });

    it("h2/h3 提取为带 id 的目录项", async () => {
      const { headings } = await compileMDXWithHeadings(
        ["## 章节一", "", "### 小节", "", "## 章节二"].join("\n"),
      );
      expect(headings).toEqual([
        { id: "章节一", text: "章节一", level: 2 },
        { id: "小节", text: "小节", level: 3 },
        { id: "章节二", text: "章节二", level: 2 },
      ]);
    });

    it("代码块带语言标识、行号与复制按钮容器", async () => {
      const html = await render("```ts\nconst a = 1;\n```");
      expect(html).toContain('data-language="ts"');
      expect(html).toContain("data-line-numbers");
      expect(html).toContain("codeblock-wrapper");
      expect(html).toContain('aria-label="Copy code"');
    });

    it("带 title 的代码块产出标题栏", async () => {
      const html = await render('```ts title="i18n/request.ts"\nconst a = 1;\n```');
      expect(html).toContain("data-rehype-pretty-code-title");
      expect(html).toContain("i18n/request.ts");
    });
  });

  describe("空与退化输入", () => {
    it("空字符串不抛错且无 heading", async () => {
      const { content, headings } = await compileMDXWithHeadings("");
      expect(headings).toEqual([]);
      expect(renderToStaticMarkup(content)).toBe("");
    });

    it("纯文本按段落渲染", async () => {
      expect(await render("只是一段普通文字")).toBe("<p>只是一段普通文字</p>");
    });
  });
});
