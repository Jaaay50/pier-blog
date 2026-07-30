import { BlogPost } from "./posts";

export interface SearchablePost {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  /** MDX 纯文本片段（前 800 字符，去 frontmatter） */
  excerpt: string;
  date: string;
}

/**
 * Phase 7：从 BlogPost 提取搜索索引数据。
 * - 移除 frontmatter（--- 包裹区）
 * - 移除 MDX import/export 行
 * - 截取前 800 字符作为正文片段
 */
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

export function buildSearchIndex(posts: BlogPost[]): SearchablePost[] {
  return posts.map((p) => {
    const text = p.content
      .replace(/^---[\s\S]*?---/, "") // 移除 frontmatter
      .replace(/^import .+$/gm, "") // 移除 import
      .replace(/^export .+$/gm, "") // 移除 export
      .replace(/[#*`_\[\]]/g, "") // 简化 markdown 标记
      .replace(/\n{2,}/g, "\n") // 压缩空行
      .trim();

    const excerpt = text.slice(0, 800);

    return {
      slug: p.slug,
      title: p.title,
      description: p.description,
      tags: p.tags,
      excerpt,
      date: p.date,
    };
  });
}
