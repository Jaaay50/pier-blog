import { describe, expect, it } from "vitest";
import {
  confidenceTier,
  isModelsDetailResponse,
  isModelsLeaderboardResponse,
  isModelsMetaResponse,
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

const validSource = {
  id: "livebench",
  name: "LiveBench",
  operatorId: "livebench",
  operatorName: "LiveBench",
  url: "https://livebench.ai",
  method: "Official CSV",
  license: "Public",
  categories: ["overall", "coding"],
  cadenceDays: 7,
  stalenessDays: 30,
  lastSuccessAt: null,
  lastStatus: "ok",
  stale: false,
};

const validLeaderboard = {
  schemaVersion: 1,
  category: "overall",
  view: "released",
  items: [{
    rank: 1,
    prevRank: null,
    model: { slug: "claude-opus-5", name: "Claude Opus 5", vendor: "Anthropic", vendorId: "anthropic", status: "released", releaseDate: null },
    abilityScore: 90,
    confidence: 0.9,
    confidenceParts: { coverage: 1, freshness: 1, agreement: 0.8, identity: 1 },
    valueScore: null,
    coverageCount: 3,
    staleSources: [],
    price: validDetail.price,
    computedAt: "2026-08-13T10:00:00.000Z",
  }],
  observing: [],
  meta: {
    scoringVersion: "mlv1",
    computedAt: "2026-08-13T10:00:00.000Z",
    empty: false,
    mainCount: 1,
    observingCount: 0,
    sources: [validSource],
    generatedAt: "2026-08-13T10:00:00.000Z",
  },
};

const validMeta = {
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
  sources: [validSource],
  models: [validLeaderboard.items[0].model],
  modelCounts: { released: 1, preview: 0 },
  pendingCount: 0,
  computedAt: null,
  generatedAt: "2026-08-13T10:00:00.000Z",
};

describe("模型列表与 meta 运行时守卫", () => {
  it("接受完整契约，并拒绝请求维度错配与嵌套缺失", () => {
    expect(isModelsLeaderboardResponse(validLeaderboard, "overall", "released")).toBe(true);
    expect(isModelsLeaderboardResponse(validLeaderboard, "coding", "released")).toBe(false);
    expect(isModelsLeaderboardResponse({ ...validLeaderboard, items: [{ ...validLeaderboard.items[0], price: { kind: "bogus" } }] })).toBe(false);
    expect(isModelsLeaderboardResponse({ ...validLeaderboard, meta: { ...validLeaderboard.meta, mainCount: 2 } })).toBe(false);
  });

  it("meta 必须含完整评分参数与可发现模型列表", () => {
    expect(isModelsMetaResponse(validMeta)).toBe(true);
    expect(isModelsMetaResponse({ ...validMeta, models: undefined })).toBe(false);
    expect(isModelsMetaResponse({ ...validMeta, models: [{ ...validMeta.models[0], status: "rumored" }] })).toBe(false);
    expect(isModelsMetaResponse({ ...validMeta, scoringParams: { ...validMeta.scoringParams, valueCost: null } })).toBe(false);
  });
});

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

  it("拒绝危险 URL 与损坏的来源/历史/别名嵌套字段", () => {
    expect(isModelsDetailResponse({ ...validDetail, model: { ...validDetail.model, officialUrl: "javascript:alert(1)" } })).toBe(false);
    expect(isModelsDetailResponse({ ...validDetail, rankings: [{ ...validDetail.rankings[0], sources: [{ sourceId: "x", percentile: 90, boards: null, fetchedAt: "x", stale: false }] }] })).toBe(false);
    expect(isModelsDetailResponse({ ...validDetail, history: [{ category: "overall" }] })).toBe(false);
    expect(isModelsDetailResponse({ ...validDetail, aliases: [{ alias: "x", sourceId: null, configLabel: null }] })).toBe(false);
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
