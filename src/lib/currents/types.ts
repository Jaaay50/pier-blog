/**
 * Currents API 类型定义。
 * 字段名以真实 API 响应为准（2026-08-05 实测 https://currents-api.ethanpier.com/v1/items）。
 */

export type CurrentsCategory =
  | "models"
  | "products"
  | "industry"
  | "papers"
  | "tutorials"
  | "opinions"
  | "opensource";

/** GET /v1/items 列表单条（不含 deepRead / alsoReportedBy） */
export interface CurrentsListItem {
  id: string;
  title: string;
  summary: string | null;
  reason: string | null;
  category: string | null;
  score: number | null;
  tags: string[] | null;
  imageUrl: string | null;
  author: string | null;
  sourceId: string | null;
  canonicalUrl: string | null;
  publishedAt: string | null;
  isFeatured: boolean;
  /** 多信源合并条数（后端若提供则显示，缺失时回退隐藏） */
  sourceCount?: number | null;
  reportedByCount?: number | null;
}

export interface CurrentsItemsResponse {
  items: CurrentsListItem[];
  nextCursor: string | null;
  hasMore: boolean;
  meta: {
    totalApprox: number;
    generatedAt: string;
  };
}

export interface CurrentsScoreBreakdown {
  novelty?: number;
  impact?: number;
  practicality?: number;
  credibility?: number;
  timeliness?: number;
}

export interface CurrentsAlsoReportedBy {
  source_id: string;
  source_name: string | null;
  source_url: string | null;
  source_title: string | null;
  published_at: string | null;
}

/** GET /v1/items/:id 详情 */
export interface CurrentsItemDetail extends CurrentsListItem {
  deepRead: string | null;
  originalTitle: string | null;
  originalLanguage: string | null;
  scoreBreakdown: CurrentsScoreBreakdown | null;
  alsoReportedBy: CurrentsAlsoReportedBy[] | null;
  related?: Array<{ id: string; title: string | null; publishedAt: string | null }> | null;
  qualityFlags?: string[] | null;
  contentTranslationZh?: string | null;
  contentTranslationEn?: string | null;
}

export interface CurrentsHighlightCard extends CurrentsListItem {
  sourceCount?: number;
}

export interface CurrentsHighlightsResponse {
  lead: CurrentsHighlightCard | null;
  items: CurrentsHighlightCard[];
  generatedAt: string;
}

export interface CurrentsDailySectionItem {
  id: string;
  title: string;
  summary: string;
  score: number;
  canonicalUrl: string;
  sourceName: string;
}

export interface CurrentsDailySection {
  key: string;
  label: string;
  items: CurrentsDailySectionItem[];
}

export interface CurrentsDailyReport {
  date: string;
  generatedAt: string;
  finalized: boolean;
  itemCount: number;
  lead: { id: string; title: string | null; paragraph: string | null } | null;
  sections: CurrentsDailySection[];
}

export interface CurrentsDailyArchiveResponse {
  dailies: Array<{ date: string; leadTitle: string | null; itemCount: number; finalized: boolean }>;
  generatedAt: string;
}

/** GET /v1/hot 热点榜事件 */
export type CurrentsHotStatus = "new" | "brewing" | "hot";

export interface CurrentsHotEvent {
  eventId: string;
  itemId: string | null;
  title: string | null;
  heat: number;
  status: CurrentsHotStatus;
  sourceCount: number;
  itemCount: number;
  sources: Array<{ id: string; name: string }>;
  publishedAt: string | null;
}

export interface CurrentsHotResponse {
  schemaVersion: number;
  items: CurrentsHotEvent[];
  meta: { windowHours: number; generatedAt: string };
}

/** GET /v1/topics 主题地图 */
export interface CurrentsTopicPreview {
  id: string;
  title: string | null;
  score: number | null;
  publishedAt: string;
}

export interface CurrentsTopic {
  id: string;
  group: "companies" | "directions" | "formats";
  name: string;
  count: number;
  featuredCount: number;
  preview: CurrentsTopicPreview[];
}

export interface CurrentsTopicsResponse {
  schemaVersion: number;
  groups: Array<{ id: string; name: string }>;
  topics: CurrentsTopic[];
  meta: { generatedAt: string };
}

export interface CurrentsStats {
  publishedItems: number;
  byStatus: Record<string, number>;
  publishedByCategory: Record<string, number>;
  lastSuccessfulRunAt: string | null;
  generatedAt: string;
}

export interface CurrentsCategoryMeta {
  key: string;
  label: string;
  publishedCount: number;
}

export interface CurrentsSource {
  id: string;
  name: string;
  nameZh: string | null;
  type: string;
  homepageUrl: string | null;
  enabled?: boolean;
}

/** GET /v1/topics/:id/items 主题详情时间线 */
export interface CurrentsTopicItemsResponse {
  topic: { id: string; group: string; name: string };
  items: CurrentsListItem[];
  nextCursor: string | null;
  hasMore: boolean;
  meta: { totalApprox: number; generatedAt: string };
}
