import fs from "fs";
import path from "path";
import rawMatter from "gray-matter";
import { load as yamlLoad } from "js-yaml";

/**
 * gray-matter 默认 engine 调用 js-yaml 3 的 safeLoad，该 API 在 js-yaml 4 已移除。
 * 项目通过 overrides 强制 js-yaml@^4.1.0（修复 CVE-2026-59870），
 * 这里提供自定义 engine：js-yaml 4 的 load 默认即安全模式（无任意代码执行标签）。
 */
function matter(input: string) {
  return rawMatter(input, {
    engines: {
      yaml: (s: string) => yamlLoad(s) as object,
    },
  });
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  content: string;
  readMinutes: number;
  /** Optional editorial metadata used by topic/series pages and dateModified. */
  updatedAt?: string;
  author?: string;
  series?: string;
  topic?: string;
  environment?: string;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toPost(slug: string, data: Record<string, unknown>, content: string): BlogPost {
  return {
    slug,
    title: stringValue(data.title) ?? slug,
    date: stringValue(data.date) ?? "1970-01-01",
    description: stringValue(data.description) ?? "",
    tags: stringArrayValue(data.tags),
    content,
    readMinutes: calcReadMinutes(content),
    updatedAt: stringValue(data.updatedAt),
    author: stringValue(data.author),
    series: stringValue(data.series),
    topic: stringValue(data.topic),
    environment: stringValue(data.environment),
  };
}

/** 中英混排阅读时间：中文 300 字/分钟，英文 200 词/分钟 */
function calcReadMinutes(content: string): number {
  const cjk = (content.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  const ascii = content.replace(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g, " ");
  const words = ascii.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(cjk / 300 + words / 200));
}

const contentDir = path.join(process.cwd(), "src/content/blog");

function getLocalizedFile(slug: string, locale: string): string | null {
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

export function getAllPosts(locale: string): BlogPost[] {
  if (!fs.existsSync(contentDir)) return [];

  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".mdx"));
  const slugSet = new Set<string>();

  files.forEach((file) => {
    const slug = file
      .replace(/\.(en|zh)\.mdx$/, "")
      .replace(/\.mdx$/, "");
    slugSet.add(slug);
  });

  return Array.from(slugSet)
    .map((slug) => {
      const fileContent = getLocalizedFile(slug, locale);
      if (!fileContent) return null;
      const { data, content } = matter(fileContent);
      return toPost(slug, data as Record<string, unknown>, content);
    })
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string, locale: string): BlogPost | null {
  const fileContent = getLocalizedFile(slug, locale);
  if (!fileContent) return null;
  const { data, content } = matter(fileContent);
  return toPost(slug, data as Record<string, unknown>, content);
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
      return toPost(slug, data as Record<string, unknown>, content);
    })
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
