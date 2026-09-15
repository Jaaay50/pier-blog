import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXPERIENCE_DEMO_IDS, LAB_DEMO_IDS, LAB_DEMOS } from "./lab-demos";

describe("LAB_DEMOS", () => {
  it("covers all seventeen demos and ships a WebP still for each", () => {
    expect(LAB_DEMOS).toHaveLength(17);
    expect(LAB_DEMOS.map((d) => d.id).sort()).toEqual([...LAB_DEMO_IDS].sort());
    for (const demo of LAB_DEMOS) {
      expect(demo.still.endsWith(".webp")).toBe(true);
      const file = path.join(process.cwd(), "public", demo.still.replace(/^\//, ""));
      expect(existsSync(file), file).toBe(true);
      if (!(EXPERIENCE_DEMO_IDS as readonly string[]).includes(demo.id)) {
        const light = file.replace(/\.webp$/, "-light.webp");
        expect(existsSync(light), light).toBe(true);
      }
    }
  });
});
