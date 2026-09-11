import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("site layout widths", () => {
  it("separates the shared navigation shell from the wider currents workspace", () => {
    expect(css).toMatch(/\.site-shell\s*\{[^}]*max-width:\s*1440px;/);
    expect(css).toMatch(/--currents-shell-max:\s*1760px;/);
    expect(css).toMatch(/\.currents-shell-container\s*\{[^}]*max-width:\s*var\(--currents-shell-max\);/);
  });

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

describe("light homepage atmosphere", () => {
  it("uses the approved desktop and mobile intensities without changing the shared ambient layer", () => {
    expect(css).toMatch(/\.hero-light-atmosphere\s*\{[^}]*--hero-light-opacity:\s*0\.42;/);
    expect(css).toMatch(/@media\s*\(max-width:\s*767px\)\s*\{\s*\.hero-light-atmosphere\s*\{[^}]*--hero-light-opacity:\s*0\.30;/);
    expect(css).toMatch(/\.hero-light-aurora\s*\{\s*opacity:\s*0;/);
    expect(css).toMatch(/\.hero-light-atmosphere\[data-ready="true"\]\s+\.hero-light-aurora\s*\{\s*opacity:\s*var\(--hero-light-opacity\);/);
    expect(css).toMatch(/\.hero-light-atmosphere\[data-ready="true"\]\s+\.hero-light-static\s*\{\s*opacity:\s*0;/);
    expect(css).toContain("ambient-drift-1 65s");
    expect(css).toContain("ambient-drift-2 85s");
    expect(css).toContain("ambient-drift-3 100s");
  });

  it("keeps the title protection soft and theme-scoped rather than adding an opaque panel", () => {
    expect(css).toMatch(/\.hero-light-content-veil\s*\{\s*background:\s*radial-gradient\(/);
    expect(css).toContain("ellipse 68% 36% at 50% 55%");
    expect(css).toContain("rgba(250, 249, 245, 0) 100%");
    expect(css).toMatch(/\.dark\s+\[data-theme='light'\]\s*\{\s*display:\s*none;/);
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

describe("guestbook coastal scene", () => {
  it("uses full-bleed landscape plates without overlay chrome", () => {
    expect(css).toContain("url('/guestbook/coast-dawn.webp')");
    expect(css).toContain("url('/guestbook/coast-day.webp')");
    expect(css).toContain("url('/guestbook/coast-dusk.webp')");
    expect(css).toContain("url('/guestbook/coast-night.webp')");
    expect(css).toMatch(/\.guestbook-coastal-scene\s*\{[^}]*width:\s*100%;/);
    expect(css).toMatch(/\.guestbook-coastal-video\s*\{[^}]*object-fit:\s*cover;/);
    expect(css).not.toMatch(/coastal-grass/);
    expect(css).not.toMatch(/guestbook-coastal-intro/);
  });
});
