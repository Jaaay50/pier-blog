import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");
const RUNTIME_ROOTS = ["src", "public", "next.config.mjs"];
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);

function walk(relativePath: string): string[] {
  const abs = path.join(ROOT, relativePath);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isFile()) return [abs];

  const files: string[] = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(child));
      continue;
    }
    if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) continue;
    files.push(path.join(ROOT, child));
  }
  return files;
}

describe("Giscus 运行时残留", () => {
  it("组件和主题 CSS 已删除", () => {
    expect(existsSync(path.join(ROOT, "src/components/GiscusComments.tsx"))).toBe(false);
    expect(existsSync(path.join(ROOT, "public/giscus-light.css"))).toBe(false);
    expect(existsSync(path.join(ROOT, "public/giscus-dark.css"))).toBe(false);
  });

  it("运行时代码、配置和静态资源不再引用 Giscus", () => {
    const hits: string[] = [];
    for (const file of RUNTIME_ROOTS.flatMap(walk)) {
      const text = readFileSync(file, "utf8");
      if (/giscus/i.test(text)) {
        hits.push(path.relative(ROOT, file));
      }
    }
    expect(hits).toEqual([]);
  });
});
