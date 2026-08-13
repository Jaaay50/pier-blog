import { describe, expect, it } from "vitest";
import {
  confidenceTier,
  isModelsDetailResponse,
  isValidModelSlug,
} from "./models-types";

const validDetail = {
  schemaVersion: 1,
  model: {
    slug: "claude-opus-5",
    name: "Claude Opus 5",
    vendor: "Anthropic",
    vendorId: "anthropic",
    status: "released",
    releaseDate: "2026-07-24",
    contextWindow: null,
    officialModelId: "claude-opus-5",
    officialUrl: "https://claude.com/pricing",
    verifiedAt: "2026-08-13",
    notes: null,
  },
  price: { kind: "payg", inputUsdPerMtok: 5, outputUsdPerMtok: 25, sourceUrl: null, verifiedAt: null, notes: null },
  rankings: [
    {
      category: "overall",
      rank: 1,
      prevRank: null,
      abilityScore: 94.5,
      confidence: 0.96,
      confidenceParts: { coverage: 1, freshness: 1, agreement: 0.9, identity: 0.85 },
      valueScore: null,
      coverageCount: 3,
      status: "main",
      sources: [],
      computedAt: "2026-08-13T10:00:00.000Z",
    },
  ],
  history: [],
  aliases: [],
  meta: { scoringVersion: "mlv1", generatedAt: "2026-08-13T10:00:00.000Z" },
};

describe("isModelsDetailResponse", () => {
  it("接受合法契约", () => {
    expect(isModelsDetailResponse(validDetail)).toBe(true);
  });

  it("拒绝：schemaVersion 不符 / model 缺字段 / 非法 status / 非法 category / rankings 非数组", () => {
    expect(isModelsDetailResponse({ ...validDetail, schemaVersion: 2 })).toBe(false);
    expect(isModelsDetailResponse({ ...validDetail, model: { ...validDetail.model, slug: 1 } })).toBe(false);
    expect(isModelsDetailResponse({ ...validDetail, model: { ...validDetail.model, status: "rumored" } })).toBe(false);
    expect(
      isModelsDetailResponse({
        ...validDetail,
        rankings: [{ ...validDetail.rankings[0], category: "bogus" }],
      }),
    ).toBe(false);
    expect(isModelsDetailResponse({ ...validDetail, rankings: "nope" })).toBe(false);
    expect(isModelsDetailResponse(null)).toBe(false);
    expect(isModelsDetailResponse([])).toBe(false);
  });

  it("拒绝：rankings 数值字段非法 / aliases 缺失", () => {
    expect(
      isModelsDetailResponse({
        ...validDetail,
        rankings: [{ ...validDetail.rankings[0], abilityScore: "high" }],
      }),
    ).toBe(false);
    const withoutAliases: Record<string, unknown> = { ...validDetail };
    delete withoutAliases.aliases;
    expect(isModelsDetailResponse(withoutAliases)).toBe(false);
  });
});

describe("confidenceTier", () => {
  it("阈值分档：≥0.75 高、≥0.5 中、其余低", () => {
    expect(confidenceTier(0.75)).toBe("high");
    expect(confidenceTier(0.74)).toBe("medium");
    expect(confidenceTier(0.5)).toBe("medium");
    expect(confidenceTier(0.49)).toBe("low");
  });
});

describe("isValidModelSlug", () => {
  it("接受合法 slug，拒绝保留字/非法字符/超长", () => {
    expect(isValidModelSlug("claude-opus-5")).toBe(true);
    expect(isValidModelSlug("gpt-5-6-sol")).toBe(true);
    expect(isValidModelSlug("leaderboard")).toBe(false);
    expect(isValidModelSlug("meta")).toBe(false);
    expect(isValidModelSlug("methodology")).toBe(false);
    expect(isValidModelSlug("UPPER")).toBe(false);
    expect(isValidModelSlug("a".repeat(65))).toBe(false);
    expect(isValidModelSlug("has space")).toBe(false);
    expect(isValidModelSlug("")).toBe(false);
  });
});
