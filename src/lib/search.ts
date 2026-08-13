import { BlogPost } from "./posts";
import { CURRENTS_TOPIC_IDS, CURRENTS_TOPIC_NAMES } from "./currents/topics";

export interface SearchablePost {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  /** MDX 纯文本片段（前 800 字符，去 frontmatter） */
  excerpt: string;
  date: string;
}

/* ─────────────── 统一全站搜索文档模型 ─────────────── */

export type SearchDocType = "blog" | "page" | "topic";

export interface SearchDoc {
  type: SearchDocType;
  /** 类型内唯一 id：blog slug / 页面 key / topic id */
  id: string;
  title: string;
  description: string;
  tags: string[]; // 参与索引但不展示也行
  keywords: string[]; // 额外索引词（如 ["MCP","Skill","Agent","接入"]），不展示
  excerpt: string;
  /** locale 内相对路径，如 /blog/xxx、/currents/agent、/currents?view=all */
  href: string;
}

/**
 * Phase 7：相关文章推荐（无向量，简单可靠）。
 * 打分 = tag 交集数 × 10 + 日期接近度（同年 +2，相邻年 +1）
 */
export function getRelatedPosts(
  current: BlogPost,
  all: BlogPost[],
  limit = 3
): BlogPost[] {
  const currentYear = new Date(current.date).getFullYear();
  return all
    .filter((p) => p.slug !== current.slug)
    .map((p) => {
      const tagOverlap = p.tags.filter((t) => current.tags.includes(t)).length;
      const yearDiff = Math.abs(new Date(p.date).getFullYear() - currentYear);
      const dateScore = yearDiff === 0 ? 2 : yearDiff === 1 ? 1 : 0;
      return { post: p, score: tagOverlap * 10 + dateScore };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.post);
}

/**
 * Phase 7：从 BlogPost 提取搜索文档。
 * - 移除 frontmatter（--- 包裹区）
 * - 移除 MDX import/export 行
 * - 截取前 800 字符作为正文片段
 */
export function buildSearchIndex(posts: BlogPost[]): SearchDoc[] {
  return posts.map((p) => {
    const text = p.content
      .replace(/^---[\s\S]*?---/, "") // 移除 frontmatter
      .replace(/^import .+$/gm, "") // 移除 import
      .replace(/^export .+$/gm, "") // 移除 export
      .replace(/[#*`_[\]]/g, "") // 简化 markdown 标记
      .replace(/\n{2,}/g, "\n") // 压缩空行
      .trim();

    const excerpt = text.slice(0, 800);

    return {
      type: "blog",
      id: p.slug,
      title: p.title,
      description: p.description,
      tags: p.tags,
      keywords: [],
      excerpt,
      href: `/blog/${p.slug}`,
    };
  });
}

/* ─────────────── 静态功能页文档 ─────────────── */

type Locale = "zh" | "en";

const AGENT_PAGE_KEYWORDS = [
  "MCP",
  "mcp",
  "Skill",
  "skill",
  "Agent",
  "agent",
  "接入",
  "工具",
  "tools",
  "currents_hot",
  "currents_search",
  "currents_item",
  "currents_event",
  "currents_daily",
];

const FEEDBACK_PAGE_KEYWORDS = [
  "反馈",
  "feedback",
  "bug",
  "建议",
  "suggestion",
  "报告",
  "report",
];

const FEATURE_PAGE_DEFS: Record<
  Locale,
  Array<{
    id: string;
    title: string;
    description: string;
    keywords: string[];
    href: string;
  }>
> = {
  zh: [
    {
      id: "currents",
      title: "Currents 精选",
      description: "AI 行业动态精选，每日人工挑选的重要资讯",
      keywords: ["currents", "精选", "featured", "动态", "资讯", "news"],
      href: "/currents",
    },
    {
      id: "currents-all",
      title: "全部动态",
      description: "AI 资讯完整时间线，按时间倒序浏览全部动态",
      keywords: ["currents", "全部动态", "all", "时间线", "timeline", "资讯"],
      href: "/currents?view=all",
    },
    {
      id: "currents-hot",
      title: "热点榜",
      description: "当前讨论热度最高的 AI 事件与话题榜单",
      keywords: ["热点", "hot", "榜单", "热门", "趋势", "trending", "currents_hot"],
      href: "/currents/hot",
    },
    {
      id: "currents-models",
      title: "模型榜",
      description: "跨六个独立公开评测的基础模型共识榜：综合、编程、Agent、推理与性价比",
      keywords: ["模型榜", "models", "leaderboard", "模型", "排行", "评测", "benchmark"],
      href: "/currents/models",
    },
    {
      id: "currents-daily",
      title: "AI 日报",
      description: "每日 AI 行业动态摘要与归档",
      keywords: ["日报", "daily", "每日", "摘要", "digest", "currents_daily"],
      href: "/currents/daily",
    },
    {
      id: "currents-topics",
      title: "主题",
      description: "按主题浏览 AI 动态：公司、技术方向与行业事件",
      keywords: ["主题", "topics", "topic", "分类", "标签"],
      href: "/currents/topics",
    },
    {
      id: "currents-changelog",
      title: "更新日志",
      description: "Currents 产品的功能更新与变更记录",
      keywords: ["更新日志", "changelog", "更新", "版本", "release"],
      href: "/currents/changelog",
    },
    {
      id: "currents-agent",
      title: "Agent 接入",
      description: "通过 MCP 与 Skill 把 Currents 接入你的 Agent 工具链",
      keywords: AGENT_PAGE_KEYWORDS,
      href: "/currents/agent",
    },
    {
      id: "feedback",
      title: "反馈",
      description: "提交问题反馈、bug 报告与产品建议",
      keywords: FEEDBACK_PAGE_KEYWORDS,
      href: "/feedback",
    },
  ],
  en: [
    {
      id: "currents",
      title: "Currents Featured",
      description: "Hand-picked highlights from the AI industry",
      keywords: ["currents", "featured", "highlights", "news", "精选"],
      href: "/currents",
    },
    {
      id: "currents-all",
      title: "All Updates",
      description: "The complete AI news timeline in reverse chronological order",
      keywords: ["currents", "all", "all updates", "timeline", "news", "动态"],
      href: "/currents?view=all",
    },
    {
      id: "currents-hot",
      title: "Hot Board",
      description: "The most-discussed AI events and topics right now",
      keywords: ["hot", "hot board", "trending", "popular", "currents_hot", "热点"],
      href: "/currents/hot",
    },
    {
      id: "currents-models",
      title: "Model Leaderboard",
      description: "Consensus foundation-model leaderboard across six independent public evaluations: overall, coding, agent, reasoning, and value",
      keywords: ["models", "model leaderboard", "leaderboard", "benchmark", "ranking", "模型榜"],
      href: "/currents/models",
    },
    {
      id: "currents-daily",
      title: "AI Daily",
      description: "Daily digest and archive of AI industry news",
      keywords: ["daily", "ai daily", "digest", "日报", "currents_daily"],
      href: "/currents/daily",
    },
    {
      id: "currents-topics",
      title: "Topics",
      description: "Browse AI updates by topic: companies, technologies, and industry events",
      keywords: ["topics", "topic", "categories", "主题"],
      href: "/currents/topics",
    },
    {
      id: "currents-changelog",
      title: "Changelog",
      description: "Product updates and change history for Currents",
      keywords: ["changelog", "updates", "release", "更新日志"],
      href: "/currents/changelog",
    },
    {
      id: "currents-agent",
      title: "Agent Access",
      description: "Connect Currents to your agent toolchain via MCP and Skills",
      keywords: AGENT_PAGE_KEYWORDS,
      href: "/currents/agent",
    },
    {
      id: "feedback",
      title: "Feedback",
      description: "Report bugs and send product suggestions",
      keywords: FEEDBACK_PAGE_KEYWORDS,
      href: "/feedback",
    },
  ],
};

const TOPIC_DESCRIPTION: Record<Locale, string> = {
  zh: "主题动态与归档",
  en: "Topic feed and archive",
};

/**
 * 构建静态功能页 + 主题页搜索文档（双语）。
 * 功能页 type=page，主题页 type=topic；均无 excerpt，不参与正文召回。
 */
export function buildFeatureDocs(locale: Locale): SearchDoc[] {
  const pages: SearchDoc[] = FEATURE_PAGE_DEFS[locale].map((p) => ({
    type: "page",
    id: p.id,
    title: p.title,
    description: p.description,
    tags: [],
    keywords: p.keywords,
    excerpt: "",
    href: p.href,
  }));

  const topics: SearchDoc[] = CURRENTS_TOPIC_IDS.map((id) => {
    const name = CURRENTS_TOPIC_NAMES[id] ?? id;
    return {
      type: "topic",
      id,
      title: name,
      description: TOPIC_DESCRIPTION[locale],
      tags: [],
      keywords: [name, name.toLowerCase(), id],
      excerpt: "",
      href: `/currents/topics/${id}`,
    };
  });

  return [...pages, ...topics];
}

/* ─────────────── 召回后重排 ─────────────── */

export interface FlexIndexLike {
  add(id: number, text: string): void;
  search(query: string, options?: { limit?: number }): number[];
}

const TYPE_PRIORITY: Record<SearchDocType, number> = {
  page: 0,
  topic: 1,
  blog: 2,
};

function keywordMatch(doc: SearchDoc, q: string): boolean {
  return doc.keywords.some((k) => {
    const kw = k.trim().toLowerCase();
    if (!kw) return false;
    return kw === q || (q.length >= 2 && kw.includes(q));
  });
}

/**
 * FlexSearch 召回后的重排（纯函数，可直接测试）：
 * 1. 精确功能页优先：query（trim、小写）命中某 doc 的 keywords
 *    （完全相等，或 keywords 项包含 query 且 query 长度 ≥ 2）→ 排最前；
 * 2. 其次 type 优先级 page > topic > blog，同级内 title 命中 > description 命中；
 * 3. 其余保持 FlexSearch 原顺序（稳定排序）。
 */
export function rankResults(
  docs: SearchDoc[],
  query: string,
  flexIds: number[]
): SearchDoc[] {
  const q = query.trim().toLowerCase();
  if (!q) return flexIds.map((id) => docs[id]).filter(Boolean);

  return flexIds
    .map((id, order) => ({ doc: docs[id], order }))
    .filter((r) => r.doc)
    .sort((a, b) => {
      const am = keywordMatch(a.doc, q);
      const bm = keywordMatch(b.doc, q);
      if (am !== bm) return am ? -1 : 1;

      const at = TYPE_PRIORITY[a.doc.type];
      const bt = TYPE_PRIORITY[b.doc.type];
      if (at !== bt) return at - bt;

      const hit = (doc: SearchDoc): number => {
        if (doc.title.toLowerCase().includes(q)) return 0;
        if (doc.description.toLowerCase().includes(q)) return 1;
        return 2;
      };
      const ah = hit(a.doc);
      const bh = hit(b.doc);
      if (ah !== bh) return ah - bh;

      return a.order - b.order;
    })
    .map((r) => r.doc);
}

/**
 * FlexSearch 召回 + 重排（生产路径封装）。
 * index 约定与 docs 同序编号（add(i, ...)）。
 */
export function searchDocs(
  docs: SearchDoc[],
  query: string,
  index: FlexIndexLike,
  limit = 8
): SearchDoc[] {
  return rankResults(docs, query, index.search(query, { limit }));
}
