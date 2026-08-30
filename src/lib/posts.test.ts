import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAllSlugs, getPostBySlug } from "./posts";

const blogDir = path.join(process.cwd(), "src/content/blog");

function readPost(name: string) {
  return readFileSync(path.join(blogDir, name), "utf8");
}

describe("article frontmatter", () => {
  it("exposes updatedAt for JSON-LD dateModified", () => {
    const post = getPostBySlug("frontend-performance-optimization", "zh");
    expect(post?.updatedAt).toBe("2026-08-30");
    expect(post?.updatedAt ?? post?.date).toBe("2026-08-30");
    expect(post?.author).toBe("Ethan Pier");
    expect(post?.topic).toBe("craft");
  });

  it("parses required fields for every localized article", () => {
    const slugs = getAllSlugs();
    expect(slugs.length).toBe(12);

    for (const slug of slugs) {
      for (const locale of ["zh", "en"] as const) {
        const post = getPostBySlug(slug, locale);
        expect(post, `${slug}.${locale}`).not.toBeNull();
        expect(post!.title.length).toBeGreaterThan(0);
        expect(post!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(post!.description.length).toBeGreaterThan(0);
        expect(post!.tags.length).toBeGreaterThan(0);
        expect(post!.author).toBe("Ethan Pier");
        expect(post!.content.trim().length).toBeGreaterThan(0);
        expect(post!.readMinutes).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("keeps bilingual files paired and free of tutorial code fences", () => {
    const files = readdirSync(blogDir).filter((f) => f.endsWith(".mdx"));
    const zh = files.filter((f) => f.endsWith(".zh.mdx")).sort();
    const en = files.filter((f) => f.endsWith(".en.mdx")).sort();
    expect(zh.map((f) => f.replace(".zh.mdx", ""))).toEqual(
      en.map((f) => f.replace(".en.mdx", "")),
    );

    for (const file of files) {
      const source = readPost(file);
      expect(source, file).not.toMatch(/^```/m);
      expect(source, file).not.toContain("'use server'");
      expect(source, file).not.toContain("async function*");
    }
  });
});
