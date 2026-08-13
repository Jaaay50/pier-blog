import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const meta = {
  schemaVersion: 1,
  scoringVersion: "mlv1",
  scoringParams: {
    confidenceWeights: { coverage: 0.45, freshness: 0.25, agreement: 0.25, identity: 0.05 },
    agreementSigmaCap: 30,
    singleSourceAgreement: 0.5,
    medianFoldIdentity: 0.85,
    minCoverage: { overall: 3, coding: 2, agent: 2, reasoning: 2 },
    valueCost: { inputMtok: 1, outputMtok: 0.25 },
    valueMinConfidence: 0.5,
  },
  sources: [],
  models: [{ slug: "claude-opus-5", name: "Claude Opus 5", vendor: "Anthropic", vendorId: "anthropic", status: "released", releaseDate: null }],
  modelCounts: { released: 1, preview: 0 },
  pendingCount: 0,
  computedAt: null,
  generatedAt: "2026-08-13T00:00:00.000Z",
};

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/search-index", () => {
  it("成功时加入模型详情；meta 故障时保留静态索引并标记 no-store 降级", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(meta), { status: 200 })));
    const ok = await GET();
    const body = await ok.json();
    expect(body.en.some((doc: { href: string }) => doc.href === "/currents/models/claude-opus-5")).toBe(true);
    expect(ok.headers.get("x-search-index-degraded")).toBe("none");

    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad gateway", { status: 502 })));
    const degraded = await GET();
    const fallback = await degraded.json();
    expect(fallback.en.some((doc: { href: string }) => doc.href === "/currents/models")).toBe(true);
    expect(fallback.en.some((doc: { href: string }) => doc.href === "/currents/models/claude-opus-5")).toBe(false);
    expect(degraded.headers.get("cache-control")).toBe("no-store");
    expect(degraded.headers.get("x-search-index-degraded")).toBe("models");
  });
});
