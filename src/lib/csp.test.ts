import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DENSITY_SCRIPT, cspHash, inlineScriptHashes } from "./csp";
import { PARTICLE_GATE_SCRIPT } from "@/components/ParticleGate";

describe("inline script hashes", () => {
  it("locks the particle gate and density scripts to stable hashes", () => {
    const hashes = inlineScriptHashes();
    expect(hashes).toEqual([cspHash(PARTICLE_GATE_SCRIPT), cspHash(DENSITY_SCRIPT)]);
    expect(hashes[0]).toMatch(/^'sha256-[A-Za-z0-9+/=]+'$/);
    expect(new Set(hashes).size).toBe(2);
  });

  it("matches the density script actually inlined in the locale layout", () => {
    const layout = readFileSync(
      path.join(process.cwd(), "src/app/[locale]/layout.tsx"),
      "utf8",
    );
    expect(layout).toContain("DENSITY_SCRIPT");
    expect(layout).not.toContain("pier-currents-density-v1");
  });
});
