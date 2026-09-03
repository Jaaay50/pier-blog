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

describe("hero ambient seam", () => {
  it("extends the hero light field with mask-image instead of an opaque band", () => {
    expect(css).toMatch(/--hero-seam-overlap:\s*30vh/);
    expect(css).toMatch(
      /\.hero-atmosphere-field\s*\{[^}]*-webkit-mask-image:\s*linear-gradient/,
    );
    expect(css).toMatch(
      /\.hero-atmosphere-tail\s*\{[^}]*-webkit-mask-image:\s*linear-gradient/,
    );
    expect(css).toMatch(
      /\.hero-immersive\s*\{[^}]*overflow-x:\s*clip;[^}]*overflow-y:\s*visible;/,
    );
    expect(css).not.toMatch(
      /hero-atmosphere[\s\S]{0,400}from-\[var\(--bg-primary\)\]/,
    );
  });

  it("stops the scroll-linked background scale for reduced motion", () => {
    expect(css).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.hero-atmosphere-field\s*\{[^}]*transform:\s*none\s*!important;/,
    );
  });
});

describe("hero CJK title punctuation", () => {
  it("halves the fullwidth comma box so the mark sits between neighboring glyphs", () => {
    expect(css).toMatch(
      /\.hero-cjk-punct\s*\{[^}]*width:\s*0\.5em;[^}]*min-width:\s*0;/,
    );
  });
});

describe("article TOC", () => {
  it("hides the mobile TOC on desktop so accessible names are not duplicated", () => {
    expect(css).toMatch(
      /@media\s*\(min-width:\s*1024px\)\s*\{\s*\.toc-fab,\s*\.toc-drawer\s*\{[^}]*display:\s*none;/,
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
