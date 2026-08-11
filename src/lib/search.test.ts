import { describe, it, expect } from "vitest";
import {
  buildFeatureDocs,
  buildSearchIndex,
  rankResults,
  type SearchDoc,
} from "./search";
import { CURRENTS_TOPIC_IDS } from "./currents/topics";
import type { BlogPost } from "./posts";

function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    slug: "hello-world",
    title: "Hello World",
    description: "第一篇博客",
    date: "2026-01-01",
    tags: ["life"],
    content: "正文内容",
    readMinutes: 1,
    ...overrides,
  };
}

function docOf(docs: SearchDoc[], href: string): SearchDoc {
  const doc = docs.find((d) => d.href === href);
  if (!doc) throw new Error(`doc not found: ${href}`);
  return doc;
}

/* ─────────────── buildSearchIndex 回归 ─────────────── */

describe("buildSearchIndex", () => {
  it("生成 blog 类型文档：id=slug、href=/blog/slug、空 keywords", () => {
    const [doc] = buildSearchIndex([makePost()]);
    expect(doc.type).toBe("blog");
    expect(doc.id).toBe("hello-world");
    expect(doc.href).toBe("/blog/hello-world");
    expect(doc.title).toBe("Hello World");
    expect(doc.description).toBe("第一篇博客");
    expect(doc.tags).toEqual(["life"]);
    expect(doc.keywords).toEqual([]);
  });

  it("移除 frontmatter / import / export / markdown 标记", () => {
    const content = [
      "---",
      "title: x",
      "---",
      'import A from "a";',
      "export const b = 1;",
      "# 标题 **加粗** `代码` [链接]",
      "正文",
    ].join("\n");
    const [doc] = buildSearchIndex([makePost({ content })]);
    expect(doc.excerpt).not.toContain("---");
    expect(doc.excerpt).not.toContain("import A");
    expect(doc.excerpt).not.toContain("export const");
    expect(doc.excerpt).not.toMatch(/[#*`[\]]/);
    expect(doc.excerpt).toContain("正文");
  });

  it("excerpt 截取前 800 字符", () => {
    const [doc] = buildSearchIndex([makePost({ content: "a".repeat(1000) })]);
    expect(doc.excerpt).toHaveLength(800);
  });
});

/* ─────────────── buildFeatureDocs ─────────────── */

describe("buildFeatureDocs", () => {
  const FEATURE_HREFS = [
    "/currents",
    "/currents?view=all",
    "/currents/hot",
    "/currents/daily",
    "/currents/topics",
    "/currents/changelog",
    "/currents/agent",
    "/feedback",
  ];

  it.each(["zh", "en"] as const)("%s：8 个功能页 + 全部主题页", (locale) => {
    const docs = buildFeatureDocs(locale);
    const pages = docs.filter((d) => d.type === "page");
    const topics = docs.filter((d) => d.type === "topic");
    expect(pages).toHaveLength(8);
    expect(pages.map((d) => d.href)).toEqual(FEATURE_HREFS);
    expect(topics).toHaveLength(CURRENTS_TOPIC_IDS.length);
    for (const id of CURRENTS_TOPIC_IDS) {
      const doc = topics.find((d) => d.id === id);
      expect(doc, `topic ${id}`).toBeDefined();
      expect(doc!.href).toBe(`/currents/topics/${id}`);
    }
  });

  it("agent 页 keywords 覆盖 MCP/Skill/Agent/反馈类词与工具名", () => {
    for (const locale of ["zh", "en"] as const) {
      const agent = docOf(buildFeatureDocs(locale), "/currents/agent");
      for (const kw of ["MCP", "Skill", "Agent", "接入", "currents_hot", "currents_daily"]) {
        expect(agent.keywords).toContain(kw);
      }
      const feedback = docOf(buildFeatureDocs(locale), "/feedback");
      for (const kw of ["反馈", "feedback", "bug", "suggestion"]) {
        expect(feedback.keywords).toContain(kw);
      }
    }
  });

  it("主题页 title 为可读名称，description 为 i18n 一句话", () => {
    const zh = buildFeatureDocs("zh");
    expect(docOf(zh, "/currents/topics/openai").title).toBe("OpenAI");
    expect(docOf(zh, "/currents/topics/mcp").title).toBe("MCP");
    expect(docOf(zh, "/currents/topics/mcp").description).toBe("主题动态与归档");
    const en = buildFeatureDocs("en");
    expect(docOf(en, "/currents/topics/mcp").description).toBe(
      "Topic feed and archive"
    );
  });
});

/* ─────────────── rankResults ─────────────── */

describe("rankResults", () => {
  const zhDocs = [
    ...buildFeatureDocs("zh"),
    ...buildSearchIndex([
      makePost({ slug: "mcp-notes", title: "我的 MCP 笔记" }),
      makePost({ slug: "feedback-loop", title: "反馈循环" }),
      makePost({ slug: "plain", title: "普通文章" }),
    ]),
  ];
  const idxOf = (href: string) =>
    zhDocs.findIndex((d) => d.href === href);

  it('query="MCP"：/currents/agent 排第一（即使 FlexSearch 原顺序靠后）', () => {
    const all = zhDocs.map((_, i) => i);
    const ranked = rankResults(zhDocs, "MCP", all);
    expect(ranked[0].href).toBe("/currents/agent");
  });

  it('query="mcp"（小写）同样命中 keywords 置顶', () => {
    const ranked = rankResults(zhDocs, "mcp", zhDocs.map((_, i) => i));
    expect(ranked[0].href).toBe("/currents/agent");
  });

  it('query="反馈"：/feedback 排第一', () => {
    const ranked = rankResults(zhDocs, "反馈", zhDocs.map((_, i) => i));
    expect(ranked[0].href).toBe("/feedback");
  });

  it('query="feedback"（英文）也命中 /feedback 置顶', () => {
    const ranked = rankResults(zhDocs, "feedback", zhDocs.map((_, i) => i));
    expect(ranked[0].href).toBe("/feedback");
  });

  it("无 keyword 命中时：page > topic > blog，title 命中 > description 命中", () => {
    // 构造仅 title/description 命中的场景，不走 keywords
    const docs: SearchDoc[] = [
      {
        type: "blog",
        id: "b1",
        title: "量子计算随想",
        description: "x",
        tags: [],
        keywords: [],
        excerpt: "",
        href: "/blog/b1",
      },
      {
        type: "page",
        id: "p1",
        title: "关于",
        description: "量子计算相关页面",
        tags: [],
        keywords: [],
        excerpt: "",
        href: "/about-quantum",
      },
      {
        type: "blog",
        id: "b2",
        title: "其他",
        description: "提到量子计算",
        tags: [],
        keywords: [],
        excerpt: "",
        href: "/blog/b2",
      },
    ];
    const ranked = rankResults(docs, "量子", [2, 0, 1]);
    // page 优先（即便只有 description 命中），然后 blog 中 title 命中的 b1 > description 命中的 b2
    expect(ranked.map((d) => d.id)).toEqual(["p1", "b1", "b2"]);
  });

  it("普通博客 query 排序不回归：同类型内保持 FlexSearch 原顺序", () => {
    const ids = [idxOf("/blog/plain"), idxOf("/blog/mcp-notes")];
    const ranked = rankResults(zhDocs, "文章", ids);
    expect(ranked.map((d) => d.href)).toEqual([
      "/blog/plain",
      "/blog/mcp-notes",
    ]);
  });

  it("keyword 命中只在召回集合内生效，不凭空引入未召回文档", () => {
    const ids = [idxOf("/blog/plain")];
    const ranked = rankResults(zhDocs, "MCP", ids);
    expect(ranked.map((d) => d.href)).toEqual(["/blog/plain"]);
  });
});
