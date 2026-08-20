import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("site layout widths", () => {
  it("expands structural content only on ultrawide screens", () => {
    expect(css).toMatch(
      /@media\s*\(min-width:\s*1920px\)\s*\{\s*\.site-content,\s*\.site-content-no-px\s*\{[^}]*max-width:\s*1440px;/,
    );
  });

  it("keeps the reading column at a readable line length", () => {
    expect(css).toMatch(
      /\.reading-column-no-px\s*\{[^}]*max-width:\s*760px;/,
    );
  });
});

describe("article code block layout", () => {
  it("keeps plain fenced code scrolling inside its wrapper", () => {
    expect(css).toMatch(
      /\[data-rehype-pretty-code-figure\]\s+pre,\s*\.codeblock-wrapper\s*>\s*pre\s*\{[^}]*max-width:\s*100%;[^}]*min-width:\s*0;[^}]*overflow-x:\s*auto;/,
    );
  });
});
