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
  models: Array<{
    slug: string;
    name: string;
    vendor: string;
    vendorId: string;
    status: ModelsView;
    releaseDate: string | null;
  }>;
  modelCounts: Record<string, number>;
  pendingCount: number;
  computedAt: string | null;
  generatedAt: string;
}

/* ──────── 运行时守卫（客户端数据岛 + 详情页 ISR，防半成品进入 UI/缓存） ──────── */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const CATEGORY_SET = new Set(MODELS_CATEGORIES);
const COVERAGE_CATEGORIES: readonly ModelsCategory[] = ["overall", "coding", "agent", "reasoning"];
const VIEW_SET = new Set<ModelsView>(["released", "preview"]);
const PRICE_KIND_SET = new Set<ModelsPrice["kind"]>(["payg", "subscription", "local", "unavailable"]);
const RANKING_STATUS_SET = new Set<ModelsDetailRanking["status"]>(["main", "observing"]);
const FOLD_SET = new Set(["default", "single", "median"]);

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInRange(value: unknown, min: number, max: number): value is number {
  return isFiniteNumber(value) && value >= min && value <= max;
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

function isHttpUrl(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}

function isNullableHttpUrl(value: unknown): value is string | null {
  return value === null || isHttpUrl(value);
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every(isFiniteNumber);
}

function hasFiniteNumberKeys(value: unknown, keys: readonly string[]): value is Record<string, number> {
  return isNumberRecord(value) && keys.every((key) => isFiniteNumber(value[key]));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isModelsPrice(value: unknown): value is ModelsPrice {
  if (!isRecord(value) || !PRICE_KIND_SET.has(value.kind as ModelsPrice["kind"])) return false;
  if (!isNullableFiniteNumber(value.inputUsdPerMtok) || !isNullableFiniteNumber(value.outputUsdPerMtok)) return false;
  if ((value.inputUsdPerMtok !== null && value.inputUsdPerMtok < 0) || (value.outputUsdPerMtok !== null && value.outputUsdPerMtok < 0)) return false;
  if (!isNullableHttpUrl(value.sourceUrl) || !isNullableString(value.verifiedAt) || !isNullableString(value.notes)) return false;
  if (value.kind === "payg") {
    return value.inputUsdPerMtok !== null && value.inputUsdPerMtok >= 0 && value.outputUsdPerMtok !== null && value.outputUsdPerMtok >= 0;
  }
  return true;
}

function isModelsSourceMeta(value: unknown): value is ModelsSourceMeta {
  if (!isRecord(value)) return false;
  if (!["id", "name", "operatorId", "operatorName", "method", "license"].every((key) => isString(value[key]))) return false;
  if (!isHttpUrl(value.url) || !isStringArray(value.categories)) return false;
  if (!value.categories.every((category) => CATEGORY_SET.has(category as ModelsCategory))) return false;
  return isFiniteNumber(value.cadenceDays) && value.cadenceDays >= 0
    && isFiniteNumber(value.stalenessDays) && value.stalenessDays >= 0
    && isNullableString(value.lastSuccessAt)
    && isNullableString(value.lastStatus)
    && typeof value.stale === "boolean";
}

function isLeaderboardModel(value: unknown, expectedView?: ModelsView): boolean {
  if (!isRecord(value)) return false;
  if (!isString(value.slug) || !isValidModelSlug(value.slug) || !isString(value.name) || !isString(value.vendor) || !isString(value.vendorId)) return false;
  if (!VIEW_SET.has(value.status as ModelsView) || (expectedView && value.status !== expectedView)) return false;
  return isNullableString(value.releaseDate);
}

function isLeaderboardRow(value: unknown, expectedView: ModelsView): value is ModelsLeaderboardRow {
  if (!isRecord(value) || !isPositiveInteger(value.rank)) return false;
  if (!(value.prevRank === null || isPositiveInteger(value.prevRank))) return false;
  if (!isLeaderboardModel(value.model, expectedView)) return false;
  if (!isInRange(value.abilityScore, 0, 100) || !isInRange(value.confidence, 0, 1)) return false;
  if (!hasFiniteNumberKeys(value.confidenceParts, ["coverage", "freshness", "agreement", "identity"]) || !Object.values(value.confidenceParts).every((part) => isInRange(part, 0, 1)) || !isNullableFiniteNumber(value.valueScore)) return false;
  if (value.valueScore !== null && !isInRange(value.valueScore, 0, 100)) return false;
  if (!isNonNegativeInteger(value.coverageCount) || !isStringArray(value.staleSources) || !isModelsPrice(value.price)) return false;
  return isString(value.computedAt);
}

export function isModelsLeaderboardResponse(
  value: unknown,
  expectedCategory?: ModelsCategory,
  expectedView?: ModelsView,
): value is ModelsLeaderboardResponse {
  if (!isRecord(value) || value.schemaVersion !== 1) return false;
  if (!CATEGORY_SET.has(value.category as ModelsCategory) || (expectedCategory && value.category !== expectedCategory)) return false;
  if (!VIEW_SET.has(value.view as ModelsView) || (expectedView && value.view !== expectedView)) return false;
  const view = value.view as ModelsView;
  if (!Array.isArray(value.items) || !value.items.every((row) => isLeaderboardRow(row, view))) return false;
  if (!Array.isArray(value.observing) || !value.observing.every((row) => isLeaderboardRow(row, view))) return false;
  if (!isRecord(value.meta)) return false;
  return isString(value.meta.scoringVersion)
    && isNullableString(value.meta.computedAt)
    && typeof value.meta.empty === "boolean"
    && isNonNegativeInteger(value.meta.mainCount)
    && isNonNegativeInteger(value.meta.observingCount)
    && value.meta.mainCount === value.items.length
    && value.meta.observingCount === value.observing.length
    && Array.isArray(value.meta.sources)
    && value.meta.sources.every(isModelsSourceMeta)
    && isString(value.meta.generatedAt);
}

function isMetaModel(value: unknown): boolean {
  return isLeaderboardModel(value);
}

export function isModelsMetaResponse(value: unknown): value is ModelsMetaResponse {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isString(value.scoringVersion)) return false;
  const params = value.scoringParams;
  if (!isRecord(params) || !hasFiniteNumberKeys(params.confidenceWeights, ["coverage", "freshness", "agreement", "identity"])) return false;
  const weights = params.confidenceWeights;
  if (!["coverage", "freshness", "agreement", "identity"].every((key) => isFiniteNumber(weights[key]))) return false;
  if (!isFiniteNumber(params.agreementSigmaCap) || !isFiniteNumber(params.singleSourceAgreement) || !isFiniteNumber(params.medianFoldIdentity)) return false;
  const minCoverage = params.minCoverage;
  if (!isNumberRecord(minCoverage) || !COVERAGE_CATEGORIES.every((category) => isNonNegativeInteger(minCoverage[category]))) return false;
  if (!isRecord(params.valueCost) || !isFiniteNumber(params.valueCost.inputMtok) || !isFiniteNumber(params.valueCost.outputMtok)) return false;
  if (!isFiniteNumber(params.valueMinConfidence)) return false;
  if (!Array.isArray(value.sources) || !value.sources.every(isModelsSourceMeta)) return false;
  if (!Array.isArray(value.models) || !value.models.every(isMetaModel)) return false;
  if (!isNumberRecord(value.modelCounts) || !Object.values(value.modelCounts).every(isNonNegativeInteger)) return false;
  return isNonNegativeInteger(value.pendingCount) && isNullableString(value.computedAt) && isString(value.generatedAt);
}

function isDetailBoard(value: unknown): boolean {
  if (!isRecord(value) || !isString(value.board)) return false;
  return isInRange(value.percentile, 0, 100)
    && isFiniteNumber(value.rawScore)
    && FOLD_SET.has(value.fold as string)
    && isPositiveInteger(value.configCount);
}

function isDetailSource(value: unknown): boolean {
  if (!isRecord(value) || !isString(value.sourceId) || !isInRange(value.percentile, 0, 100)) return false;
  return Array.isArray(value.boards) && value.boards.every(isDetailBoard) && isString(value.fetchedAt) && typeof value.stale === "boolean";
}

function isDetailRanking(value: unknown): boolean {
  if (!isRecord(value) || !CATEGORY_SET.has(value.category as ModelsCategory) || !isPositiveInteger(value.rank)) return false;
  if (!(value.prevRank === null || isPositiveInteger(value.prevRank))) return false;
  if (!isInRange(value.abilityScore, 0, 100) || !isInRange(value.confidence, 0, 1)) return false;
  if (!hasFiniteNumberKeys(value.confidenceParts, ["coverage", "freshness", "agreement", "identity"]) || !Object.values(value.confidenceParts).every((part) => isInRange(part, 0, 1)) || !isNullableFiniteNumber(value.valueScore) || !isNonNegativeInteger(value.coverageCount)) return false;
  if (value.valueScore !== null && !isInRange(value.valueScore, 0, 100)) return false;
  return RANKING_STATUS_SET.has(value.status as ModelsDetailRanking["status"])
    && Array.isArray(value.sources)
    && value.sources.every(isDetailSource)
    && isString(value.computedAt);
}

function isDetailHistory(value: unknown): boolean {
  if (!isRecord(value) || !CATEGORY_SET.has(value.category as ModelsCategory) || !isPositiveInteger(value.rank)) return false;
  return isInRange(value.abilityScore, 0, 100)
    && isInRange(value.confidence, 0, 1)
    && isNullableFiniteNumber(value.valueScore)
    && (value.valueScore === null || isInRange(value.valueScore, 0, 100))
    && RANKING_STATUS_SET.has(value.status as ModelsDetailRanking["status"])
    && VIEW_SET.has(value.modelStatus as ModelsView)
    && isString(value.scoringVersion)
    && isString(value.computedAt);
}

function isDetailAlias(value: unknown): boolean {
  return isRecord(value)
    && isString(value.alias)
    && isNullableString(value.sourceId)
    && isNullableString(value.configLabel)
    && typeof value.isDefaultConfig === "boolean";
}

export function isModelsDetailResponse(value: unknown): value is ModelsDetailResponse {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== 1) return false;
  const model = value.model;
  if (!isRecord(model)) return false;
  if (!isString(model.slug) || !isValidModelSlug(model.slug) || !isString(model.name) || !isString(model.vendor) || !isString(model.vendorId)) return false;
  if (!VIEW_SET.has(model.status as ModelsView)) return false;
  if (!isNullableString(model.releaseDate) || !isNullableFiniteNumber(model.contextWindow)) return false;
  if (model.contextWindow !== null && model.contextWindow < 0) return false;
  if (!isNullableString(model.officialModelId) || !isNullableHttpUrl(model.officialUrl) || !isNullableString(model.verifiedAt) || !isNullableString(model.notes)) return false;
  if (!isModelsPrice(value.price)) return false;
  if (!Array.isArray(value.rankings) || !value.rankings.every(isDetailRanking)) return false;
  if (!Array.isArray(value.history) || !value.history.every(isDetailHistory)) return false;
  if (!Array.isArray(value.aliases) || !value.aliases.every(isDetailAlias)) return false;
  return isRecord(value.meta) && isString(value.meta.scoringVersion) && isString(value.meta.generatedAt);
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
