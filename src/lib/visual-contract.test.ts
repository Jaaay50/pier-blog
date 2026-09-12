import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function src(relative: string) {
  return readFileSync(path.join(process.cwd(), relative), "utf8");
}

describe("first-ten-seconds visual contract", () => {
  it("keeps desktop nav labels from wrapping mid-glyph", () => {
    expect(src("src/components/Navbar.tsx")).toContain("whitespace-nowrap");
  });

  it("rebuilds the particle title per locale and skips foreign glyphs", () => {
    const hero = src("src/components/ImmersiveHero.tsx");
    const particles = src("src/components/webgl/ParticleTitle.tsx");
    expect(hero).toContain("key={resolvedTitle}");
    expect(particles).toContain("glyphBelongsToTitle");
    expect(particles).toContain("clearRect");
    expect(particles).toContain('viewTransitionName: "none"');
  });

  it("does not advertise Three.js or Framer Motion on About", () => {
    const about = src("src/app/[locale]/about/page.tsx");
    expect(about).toContain('"ogl"');
    expect(about).toContain('"motion"');
    expect(about).not.toContain("Three.js");
    expect(about).not.toContain("Framer Motion");
  });
});
