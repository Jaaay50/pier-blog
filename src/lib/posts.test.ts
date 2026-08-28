import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getPostBySlug } from "./posts";

const blogDir = path.join(process.cwd(), "src/content/blog");

function readPost(name: string) {
  return readFileSync(path.join(blogDir, name), "utf8");
}

describe("article frontmatter", () => {
  it("exposes updatedAt for JSON-LD dateModified", () => {
    const post = getPostBySlug("frontend-performance-optimization", "zh");
    expect(post?.updatedAt).toBe("2026-08-28");
    expect(post?.updatedAt ?? post?.date).toBe("2026-08-28");
    expect(post?.author).toBe("Ethan Pier");
    expect(post?.topic).toBe("performance");
  });

  it("keeps INP at ≤200ms and does not mix it with FID", () => {
    for (const file of [
      "frontend-performance-optimization.zh.mdx",
      "frontend-performance-optimization.en.mdx",
    ]) {
      const source = readPost(file);
      expect(source).toMatch(/\| INP \| ≤ 200ms \|/);
      expect(source).not.toContain("FID/INP");
      expect(source).not.toMatch(/FID\s*\|\s*< 100ms/);
    }
  });

  it("passes AbortSignal into fetch and handles empty, HTTP, abort, and cancel paths", () => {
    for (const file of [
      "building-modern-ai-interfaces.zh.mdx",
      "building-modern-ai-interfaces.en.mdx",
    ]) {
      const source = readPost(file);
      expect(source).toContain("signal,");
      expect(source).toContain("async function* streamResponse(prompt: string, signal: AbortSignal)");
      expect(source).toContain("if (!response.ok)");
      expect(source).toContain("if (!response.body)");
      expect(source).toContain("error.name !== 'AbortError'");
      expect(source).toContain("await reader.cancel()");
    }
  });
});
