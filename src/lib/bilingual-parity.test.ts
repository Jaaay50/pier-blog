import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";

function keys(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      keys(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

describe("bilingual parity", () => {
  it("keeps zh and en message keys aligned", () => {
    expect(keys(zh).sort()).toEqual(keys(en).sort());
  });

  it("keeps every blog slug paired across locales", () => {
    const dir = path.join(process.cwd(), "src/content/blog");
    const files = readdirSync(dir).filter((name) => name.endsWith(".mdx"));
    const zhSlugs = files.filter((name) => name.endsWith(".zh.mdx")).map((name) => name.replace(".zh.mdx", "")).sort();
    const enSlugs = files.filter((name) => name.endsWith(".en.mdx")).map((name) => name.replace(".en.mdx", "")).sort();
    expect(zhSlugs).toEqual(enSlugs);
  });

  it("keeps Chinese UI copy in simplified characters", () => {
    const traditional = /[聲燈塢導標術棧]/;
    expect(JSON.stringify(zh)).not.toMatch(traditional);
    expect(readFileSync(path.join(process.cwd(), "src/lib/site-metadata.ts"), "utf8")).not.toMatch(traditional);
  });
});
