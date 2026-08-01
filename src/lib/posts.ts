import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getLocale } from "next-intl/server";

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  content: string;
  readMinutes: number;
}

/** 中英混排阅读时间：中文 300 字/分钟，英文 200 词/分钟 */
function calcReadMinutes(content: string): number {
  const cjk = (content.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  const ascii = content.replace(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g, " ");
  const words = ascii.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(cjk / 300 + words / 200));
}

const contentDir = path.join(process.cwd(), "src/content/blog");

async function getLocalizedFile(slug: string): Promise<string | null> {
  const locale = await getLocale();
  
  // Try locale-specific file first (e.g., xxx.zh.mdx)
  const localizedPath = path.join(contentDir, `${slug}.${locale}.mdx`);
  if (fs.existsSync(localizedPath)) {
    return fs.readFileSync(localizedPath, "utf-8");
  }
  
  // Fall back to English
  const enPath = path.join(contentDir, `${slug}.en.mdx`);
  if (fs.existsSync(enPath)) {
    return fs.readFileSync(enPath, "utf-8");
  }
  
  // Legacy: try unqualified file
  const legacyPath = path.join(contentDir, `${slug}.mdx`);
  if (fs.existsSync(legacyPath)) {
    return fs.readFileSync(legacyPath, "utf-8");
  }
  
  return null;
}

export async function getAllPosts(): Promise<BlogPost[]> {
  if (!fs.existsSync(contentDir)) return [];

  // Get unique slugs (strip locale suffix)
  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".mdx"));
  const slugSet = new Set<string>();
  
  files.forEach((file) => {
    const slug = file
      .replace(/\.(en|zh)\.mdx$/, "")
      .replace(/\.mdx$/, "");
    slugSet.add(slug);
  });

  const posts = await Promise.all(
    Array.from(slugSet).map(async (slug) => {
      const fileContent = await getLocalizedFile(slug);
      if (!fileContent) return null;

      const { data, content } = matter(fileContent);

      return {
        slug,
        title: data.title || slug,
        date: data.date || "1970-01-01",
        description: data.description || "",
        tags: data.tags || [],
        content,
        readMinutes: calcReadMinutes(content),
      };
    })
  );

  return posts
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const fileContent = await getLocalizedFile(slug);
  if (!fileContent) return null;

  const { data, content } = matter(fileContent);

  return {
    slug,
    title: data.title || slug,
    date: data.date || "1970-01-01",
    description: data.description || "",
    tags: data.tags || [],
    content,
    readMinutes: calcReadMinutes(content),
  };
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(contentDir)) return [];
  
  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".mdx"));
  const slugSet = new Set<string>();
  
  files.forEach((file) => {
    const slug = file
      .replace(/\.(en|zh)\.mdx$/, "")
      .replace(/\.mdx$/, "");
    slugSet.add(slug);
  });
  
  return Array.from(slugSet);
}

/**
 * Locale-explicit post loader for contexts outside the next-intl request
 * scope (RSS feeds, static generation). Falls back: locale -> en -> legacy.
 */
export function getPostsForLocale(locale: "en" | "zh"): BlogPost[] {
  return getAllSlugs()
    .map((slug) => {
      const candidates = [
        path.join(contentDir, `${slug}.${locale}.mdx`),
        path.join(contentDir, `${slug}.en.mdx`),
        path.join(contentDir, `${slug}.mdx`),
      ];
      const file = candidates.find((p) => fs.existsSync(p));
      if (!file) return null;

      const { data, content } = matter(fs.readFileSync(file, "utf-8"));
      return {
        slug,
        title: data.title || slug,
        date: data.date || "1970-01-01",
        description: data.description || "",
        tags: data.tags || [],
        content,
        readMinutes: calcReadMinutes(content),
      } as BlogPost;
    })
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
