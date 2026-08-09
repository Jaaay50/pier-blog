import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { serverFetchEventDetail, serverFetchItemDetail, CurrentsServerFetchError } from "./api";

/** 模拟全局 fetch 的各种后端响应。 */
function mockFetch(impl: () => Promise<Response> | Response | never) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function validEventDetail() {
  return {
    eventId: "evt-1",
    requestedId: "evt-1",
    resolvedFromAlias: false,
    itemId: "item-1",
    eventType: "news",
    confidence: "high",
    lifecycle: "rising",
    status: "rising",
    title: "Event title",
    titleZh: "事件标题",
    titleEn: "Event title",
    progress: null,
    summary: "Summary",
    heat: 42,
    independentReportCount: 2,
    officialReportCount: 1,
    communityScoreMax: 100,
    communityCommentsMax: 50,
    communityBoost: 8,
    reportCount: 2,
    itemCount: 1,
    firstSeenAt: "2026-08-08T00:00:00.000Z",
    latestActivityAt: "2026-08-08T01:00:00.000Z",
    splitParent: null,
    splitChildren: [],
    timeline: [
      {
        itemId: "item-1",
        sourceId: "openai-news",
        sourceName: "OpenAI",
        sourceRole: "official",
        sourceOrg: "openai",
        title: "Event title",
        url: "https://openai.com/event",
        isPrimary: true,
        isOfficial: true,
        isRepresentative: true,
        communityScore: null,
        communityComments: null,
        countsAsIndependent: true,
        publishedAt: "2026-08-08T00:00:00.000Z",
      },
    ],
    meta: { generatedAt: "2026-08-08T02:00:00.000Z" },
  };
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe("serverFetchDetail：只有 404 视为不存在，其余全部上抛可重试错误", () => {
  it("后端明确 404 → 返回 null（事件不存在 → not-found）", async () => {
    mockFetch(() => jsonResponse(404, { error: "not_found" }));
    await expect(serverFetchEventDetail("evt-x", "zh")).resolves.toBeNull();
    await expect(serverFetchItemDetail("item-x", "zh")).resolves.toBeNull();
  });

  it("200 + 完整合法契约 → 返回解析结果", async () => {
    const detail = validEventDetail();
    mockFetch(() => jsonResponse(200, detail));
    await expect(serverFetchEventDetail("evt-1", "zh")).resolves.toEqual(detail);
  });

  it.each([
    ["缺必填字段", (() => { const v = validEventDetail(); delete (v as Partial<typeof v>).timeline; return v; })()],
    ["未知 eventType", { ...validEventDetail(), eventType: "unknown" }],
    ["未知 sourceRole", { ...validEventDetail(), timeline: [{ ...validEventDetail().timeline[0], sourceRole: "social" }] }],
    ["错误数组类型", { ...validEventDetail(), splitChildren: "child-1" }],
    ["危险 timeline URL", { ...validEventDetail(), timeline: [{ ...validEventDetail().timeline[0], url: "javascript:alert(1)" }] }],
    ["相对 timeline URL", { ...validEventDetail(), timeline: [{ ...validEventDetail().timeline[0], url: "/relative" }] }],
    ["缺 isRepresentative", (() => {
      const v = validEventDetail();
      const entry = { ...v.timeline[0] } as Partial<(typeof v.timeline)[number]>;
      delete entry.isRepresentative;
      return { ...v, timeline: [entry] };
    })()],
  ])("200 但%s → throw（kind=contract）", async (_label, body) => {
    mockFetch(() => jsonResponse(200, body));
    const err = await serverFetchEventDetail("evt-1", "zh").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CurrentsServerFetchError);
    expect((err as CurrentsServerFetchError).kind).toBe("contract");
    expect((err as CurrentsServerFetchError).status).toBe(200);
  });

  it.each([500, 502, 503, 429])("HTTP %i → throw CurrentsServerFetchError（绝不伪装 404）", async (status) => {
    mockFetch(() => jsonResponse(status, { error: "internal_error" }));
    const err = await serverFetchEventDetail("evt-x", "zh").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CurrentsServerFetchError);
    expect((err as CurrentsServerFetchError).kind).toBe("http");
    expect((err as CurrentsServerFetchError).status).toBe(status);
  });

  it("网络失败 / DNS / 连接拒绝 → throw（kind=network）", async () => {
    mockFetch(() => Promise.reject(new TypeError("fetch failed")));
    const err = await serverFetchEventDetail("evt-x", "zh").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CurrentsServerFetchError);
    expect((err as CurrentsServerFetchError).kind).toBe("network");
  });

  it("超时 AbortError → throw（kind=network）", async () => {
    mockFetch(() => Promise.reject(new DOMException("The operation was aborted", "AbortError")));
    const err = await serverFetchItemDetail("item-x", "zh").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CurrentsServerFetchError);
    expect((err as CurrentsServerFetchError).kind).toBe("network");
  });

  it("200 但非法 JSON → throw（kind=invalid-json，不返回半成品）", async () => {
    mockFetch(() => new Response("<html>Bad Gateway</html>", { status: 200 }));
    const err = await serverFetchEventDetail("evt-x", "zh").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CurrentsServerFetchError);
    expect((err as CurrentsServerFetchError).kind).toBe("invalid-json");
  });
});
