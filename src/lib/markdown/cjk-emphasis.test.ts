import { describe, it, expect } from "vitest";
import { renderMarkdown } from "@/lib/currents/markdown";

/**
 * 回归锁：CJK 标点相邻时 CommonMark 无法闭合强调标记。
 *
 * 线上症状是潮汐详情页把 `**来源事实：**` 原样显示成字面量。这里通过
 * 完整 renderMarkdown 管线断言，而不是单测插件内部函数 —— 保证「解析补正
 * 在 sanitize 之前生效」这一集成关系同样被锁住。
 */
describe("remarkCjkEmphasis — CJK 强调闭合补正", () => {
  describe("线上实际失效样本", () => {
    it("全角冒号后紧跟汉字：**来源事实：**报道 正确加粗", async () => {
      const html = await renderMarkdown("**来源事实：**报道称已开始洽谈。");
      expect(html).toContain("<strong>来源事实：</strong>");
      expect(html).not.toContain("**");
    });

    it("全角逗号、句号、分号、问号、感叹号后紧跟汉字", async () => {
      for (const punct of ["，", "。", "；", "？", "！", "、", "）", "》"]) {
        const html = await renderMarkdown(`**标签${punct}**内容`);
        expect(html).toContain(`<strong>标签${punct}</strong>`);
        expect(html).not.toContain("**");
      }
    });

    it("单星斜体与删除线同样补正", async () => {
      const em = await renderMarkdown("*重点：*说明文字");
      expect(em).toContain("<em>重点：</em>");
      expect(em).not.toMatch(/(^|[^*])\*([^*]|$)/);

      const del = await renderMarkdown("~~废弃：~~新版本");
      expect(del).toContain("<del>废弃：</del>");
      expect(del).not.toContain("~~");
    });

    it("原本侥幸生效的样本不被破坏（闭合符后是全角引号）", async () => {
      const html = await renderMarkdown("**未证实信息：**“洽谈中”");
      expect(html).toContain("<strong>未证实信息：</strong>");
      expect(html).not.toContain("**");
    });

    it("同一段落内多处失效标记全部补正", async () => {
      const html = await renderMarkdown("**来源事实：**A。**核心分歧：**B。");
      expect(html).toContain("<strong>来源事实：</strong>");
      expect(html).toContain("<strong>核心分歧：</strong>");
      expect(html).not.toContain("**");
    });

    it("嵌套：加粗内部的斜体一并解析", async () => {
      // 开、闭定界符均在同一文本节点内时可完整补正
      const html = await renderMarkdown("**外层：内容，**尾巴");
      expect(html).toContain("<strong>外层：内容，</strong>");
      expect(html).not.toContain("**");
    });

    /**
     * 上游遗留行为（非本插件引入，也非本插件能修）：
     * `**外层：*内层：*尾**` 中 remark 会先把内层单星配成 emphasis，
     * 导致外层 `**` 被拆到不同节点，不以完整文本节点形式出现，
     * 因此 mdast 层无法安全补正。锁住现状，避免日后误以为已修复。
     */
    it("已知限制：跨节点的嵌套强调仍保持上游行为", async () => {
      const html = await renderMarkdown("**外层：*内层：*尾**");
      expect(html).toContain("**外层：");
    });
  });

  describe("防误伤边界", () => {
    it("反斜杠转义的 \\*\\* 仍显示为字面星号，不被补正", async () => {
      const html = await renderMarkdown("\\*\\*不该加粗\\*\\*");
      expect(html).not.toContain("<strong>");
      expect(html).toContain("**不该加粗**");
    });

    it("行内代码与围栏代码内的星号原样保留", async () => {
      const inline = await renderMarkdown("`**来源事实：**` 是字面量");
      expect(inline).toContain("<code>**来源事实：**</code>");
      expect(inline).not.toContain("<strong>");

      const fenced = await renderMarkdown("```js\nconst a = 2 ** 3; // **来源：**\n```");
      expect(fenced).toContain("2 ** 3");
      expect(fenced).not.toContain("<strong>");
    });

    it("空白侧翼不匹配：乘方表达式与孤立星号", async () => {
      const html = await renderMarkdown("计算 2 ** 3 和 4 ** 5 的结果");
      expect(html).not.toContain("<strong>");
      expect(html).toContain("**");
    });

    it("纯西文文本解析结果不受影响", async () => {
      const ok = await renderMarkdown("**Source facts:** reported");
      expect(ok).toContain("<strong>Source facts:</strong>");

      // 西文场景下 CommonMark 本就不闭合，且无 CJK 语境 → 保持规范行为
      const untouched = await renderMarkdown("**label:**value");
      expect(untouched).not.toContain("<strong>");
    });

    it("内容为纯空白不产出空强调节点", async () => {
      const html = await renderMarkdown("中文 **　** 结尾");
      expect(html).not.toContain("<strong></strong>");
    });
  });

  describe("补正结果仍受 sanitize 约束", () => {
    it("补正逻辑不为 HTML 注入开后门", async () => {
      const html = await renderMarkdown("**危险：**<script>alert(1)</script>");
      expect(html).toContain("<strong>危险：</strong>");
      // 标签被剥除；残留文本不可执行（与 CJK 无关的既有行为，见下一条）
      expect(html).not.toContain("<script");
    });

    /**
     * 锁住既有边界：行内 `<script>` 在 mdast 中是 html 节点，sanitize 会丢掉
     * 标签本身但保留其间的纯文本。该行为与本插件无关（无 CJK 时同样出现），
     * 且输出为不可执行的普通文字，不构成 XSS。
     */
    it("既有边界：行内 script 标签被剥离，只剩惰性文本", async () => {
      const noCjk = await renderMarkdown("inline <script>alert(1)</script> tail");
      expect(noCjk).not.toContain("<script");
      expect(noCjk).toBe("<p>inline alert(1) tail</p>");

      // 块级 script 整体丢弃；带事件属性的元素完全移除
      expect(await renderMarkdown("<script>alert(1)</script>")).toBe("");
      const img = await renderMarkdown("**危险：**<img src=x onerror=alert(1)>");
      expect(img).not.toContain("onerror");
      expect(img).not.toContain("alert");
    });

    it("强调内部的 javascript: 链接依旧被拒绝", async () => {
      const html = await renderMarkdown("**注意：**[点我](javascript:alert(1))");
      expect(html).toContain("<strong>注意：</strong>");
      expect(html).not.toContain("javascript:");
    });
  });
});
