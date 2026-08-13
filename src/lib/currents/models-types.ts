/**
 * 潮汐模型榜 API 类型（schemaVersion 1）。
 * 字段名与后端 /v1/models/* 真实契约一致（currents-backend docs/model-leaderboard-design.md）。
 */

export type ModelsCategory = "overall" | "coding" | "agent" | "reasoning" | "value";
export type ModelsView = "released" | "preview";

export const MODELS_CATEGORIES: readonly ModelsCategory[] = [
  "overall",
  "coding",
  "agent",
  "reasoning",
  "value",
];

export interface ModelsPrice {
  kind: "payg" | "subscription" | "local" | "unavailable";
  inputUsdPerMtok: number | null;
  outputUsdPerMtok: number | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
  notes: string | null;
}

export interface ModelsLeaderboardRow {
  rank: number;
  prevRank: number | null;
  model: {
    slug: string;
    name: string;
    vendor: string;
    vendorId: string;
    status: ModelsView;
    releaseDate: string | null;
  };
  abilityScore: number;
  confidence: number;
  confidenceParts: Record<string, number>;
  valueScore: number | null;
  coverageCount: number;
  staleSources: string[];
  price: ModelsPrice;
  computedAt: string;
}

export interface ModelsSourceMeta {
  id: string;
  name: string;
  operatorId: string;
  operatorName: string;
  url: string;
  method: string;
  license: string;
  categories: string[];
  cadenceDays: number;
  stalenessDays: number;
  lastSuccessAt: string | null;
  lastStatus: string | null;
  stale: boolean;
}

export interface ModelsLeaderboardResponse {
  schemaVersion: number;
  category: ModelsCategory;
  view: ModelsView;
  items: ModelsLeaderboardRow[];
  observing: ModelsLeaderboardRow[];
  meta: {
    scoringVersion: string;
    computedAt: string | null;
    empty: boolean;
    mainCount: number;
    observingCount: number;
    sources: ModelsSourceMeta[];
    generatedAt: string;
  };
}

export interface ModelsDetailRanking {
  category: ModelsCategory;
  rank: number;
  prevRank: number | null;
  abilityScore: number;
  confidence: number;
  confidenceParts: Record<string, number>;
  valueScore: number | null;
  coverageCount: number;
  status: "main" | "observing";
  sources: Array<{
    sourceId: string;
    percentile: number;
    boards: Array<{
      board: string;
      percentile: number;
      rawScore: number;
      fold: "default" | "single" | "median";
      configCount: number;
    }>;
    fetchedAt: string;
    stale: boolean;
  }>;
  computedAt: string;
}

export interface ModelsDetailResponse {
  schemaVersion: number;
  model: {
    slug: string;
    name: string;
    vendor: string;
    vendorId: string;
    status: ModelsView;
    releaseDate: string | null;
    contextWindow: number | null;
    officialModelId: string | null;
    officialUrl: string | null;
    verifiedAt: string | null;
    notes: string | null;
  };
  price: ModelsPrice;
  rankings: ModelsDetailRanking[];
  history: Array<{
    category: ModelsCategory;
    rank: number;
    abilityScore: number;
    confidence: number;
    valueScore: number | null;
    status: "main" | "observing";
    modelStatus: ModelsView;
    scoringVersion: string;
    computedAt: string;
  }>;
  aliases: Array<{
    alias: string;
    sourceId: string | null;
    configLabel: string | null;
    isDefaultConfig: boolean;
  }>;
  meta: { scoringVersion: string; generatedAt: string };
}

export interface ModelsMetaResponse {
  schemaVersion: number;
  scoringVersion: string;
  scoringParams: {
    confidenceWeights: { coverage: number; freshness: number; agreement: number; identity: number };
    agreementSigmaCap: number;
    singleSourceAgreement: number;
    medianFoldIdentity: number;
    minCoverage: Record<string, number>;
    valueCost: { inputMtok: number; outputMtok: number };
    valueMinConfidence: number;
  };
  sources: ModelsSourceMeta[];
  modelCounts: Record<string, number>;
  pendingCount: number;
  computedAt: string | null;
  generatedAt: string;
}

/* ──────── 运行时守卫（详情页 ISR 用，防半成品缓存） ──────── */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const CATEGORY_SET = new Set(MODELS_CATEGORIES);

export function isModelsDetailResponse(value: unknown): value is ModelsDetailResponse {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== 1) return false;
  const model = value.model;
  if (!isRecord(model)) return false;
  if (typeof model.slug !== "string" || typeof model.name !== "string" || typeof model.vendor !== "string") return false;
  if (model.status !== "released" && model.status !== "preview") return false;
  const price = value.price;
  if (!isRecord(price) || typeof price.kind !== "string") return false;
  if (!Array.isArray(value.rankings)) return false;
  for (const r of value.rankings) {
    if (!isRecord(r)) return false;
    if (typeof r.category !== "string" || !CATEGORY_SET.has(r.category as ModelsCategory)) return false;
    if (typeof r.rank !== "number" || typeof r.abilityScore !== "number" || typeof r.confidence !== "number") return false;
    if (!Array.isArray(r.sources)) return false;
  }
  if (!Array.isArray(value.history) || !Array.isArray(value.aliases)) return false;
  return true;
}

/** 可信度分档（后端只出数值，档位映射是前端展示约定）。 */
export function confidenceTier(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 0.75) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

/** slug 白名单（与后端一致），非法值不触发上游请求。 */
export function isValidModelSlug(slug: string): boolean {
  return /^[a-z0-9-]{1,64}$/.test(slug) && slug !== "leaderboard" && slug !== "meta" && slug !== "methodology";
}
