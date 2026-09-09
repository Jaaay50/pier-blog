import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  serverFetchEventDetail,
  serverFetchItemDetail,
  serverFetchDailyLatest,
  serverFetchDailyByDate,
  serverFetchSources,
  serverFetchItems,
  serverFetchModelsLeaderboard,
  serverFetchHot,
  serverFetchTopics,
  clearCurrentsReadCache,
  fetchItems,
  CurrentsApiError,
  CurrentsServerFetchError,
  fetchModelsLeaderboard,
  fetchModelsMeta,
  isValidCurrentsDailyDate,
  isValidCurrentsResourceId,
  submitFeedback,
  submitSiteFeedback,
} from "./api";

describe("public GET cache and ISR first paint", () => {
  beforeEach(() => { clearCurrentsReadCache(); });
  afterEach(() => { clearCurrentsReadCache(); vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("only reuses completed public responses by full query key for sixty seconds", async () => {
    vi.stubGlobal("window", {});
    const fetchMock = vi.fn(async () => jsonResponse(200, { items: [], hasMore: false, nextCursor: null }));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
    await fetchItems({ locale: "zh", view: "all" });
    await fetchItems({ locale: "zh", view: "all" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await fetchItems({ locale: "zh", view: "papers" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_001);
    await fetchItems({ locale: "zh", view: "all" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("never caches a failed request", async () => {
    vi.stubGlobal("window", {});
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(503, {})).mockResolvedValue(jsonResponse(200, { items: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchItems({ locale: "zh" })).rejects.toMatchObject({ status: 503 });
    await fetchItems({ locale: "zh" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("initial hot/topics requests use bounded 300-second ISR and reject malformed top-level data", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, { schemaVersion: 2, items: [], watching: [] })).mockResolvedValueOnce(jsonResponse(200, { groups: [], topics: [] }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await serverFetchHot("zh")).toMatchObject({ schemaVersion: 2 });
    expect(await serverFetchTopics("en")).toMatchObject({ topics: [] });
    for (const call of fetchMock.mock.calls) expect(call[1]).toMatchObject({ next: { revalidate: 300 } });
    fetchMock.mockResolvedValue(jsonResponse(200, { invalid: true }));
    await expect(serverFetchHot("zh")).resolves.toBeNull();
    await expect(serverFetchTopics("en")).resolves.toBeNull();
    await expect(serverFetchModelsLeaderboard()).resolves.toBeNull();
  });
});

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
    heatHistory: {
      windowHours: 24,
      bucketHours: 3,
      windowStart: "2026-08-07T02:00:00.000Z",
      windowEnd: "2026-08-08T02:00:00.000Z",
      points: [
        {
          bucketStart: "2026-08-08T00:00:00.000Z",
          heat: 42,
          reportHeat: 20,
          communityHeat: 22,
          independentReportCount: 2,
          communityScoreMax: 100,
        },
      ],
    },
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

describe("submitFeedback：公开写入端点客户端契约", () => {
  it("POST 正确 payload，去除 message 前后空白并传 honeypot", async () => {
    const fetchMock = vi.fn(() => jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      submitFeedback({
        targetType: "event",
        targetId: "event-1",
        category: "translation_issue",
        message: "  details  ",
        locale: "en",
        turnstileToken: "turnstile-token",
        website: "bot-value",
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://currents-api.ethanpier.com/v1/feedback");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json", Accept: "application/json" });
    expect(JSON.parse(String(init.body))).toEqual({
      targetType: "event",
      targetId: "event-1",
      category: "translation_issue",
      message: "details",
      locale: "en",
      turnstileToken: "turnstile-token",
      website: "bot-value",
    });
  });

  it("duplicate:true 原样返回；空 message 不进入 payload", async () => {
    const fetchMock = vi.fn(() => jsonResponse(200, { ok: true, duplicate: true }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      submitFeedback({ targetType: "item", targetId: "item-1", category: "other", message: "  ", locale: "zh", turnstileToken: "token" }),
    ).resolves.toEqual({ ok: true, duplicate: true });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).not.toHaveProperty("message");
  });

  it.each([400, 404, 429, 500])("HTTP %i → CurrentsApiError 保留 status", async (status) => {
    mockFetch(() => jsonResponse(status, { error: "failed" }));
    const err = await submitFeedback({ targetType: "item", targetId: "item-1", category: "other", locale: "zh", turnstileToken: "token" })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CurrentsApiError);
    expect((err as CurrentsApiError).status).toBe(status);
    expect((err as CurrentsApiError).code).toBe("failed");
  });

  it("网络失败 → status=null；200 非 JSON/错误契约 → invalid-json", async () => {
    mockFetch(() => Promise.reject(new TypeError("fetch failed")));
    const network = await submitFeedback({ targetType: "item", targetId: "item-1", category: "other", locale: "zh", turnstileToken: "token" })
      .catch((e: unknown) => e);
    expect(network).toBeInstanceOf(CurrentsApiError);
    expect((network as CurrentsApiError).status).toBeNull();

    mockFetch(() => new Response("not json", { status: 200 }));
    await expect(
      submitFeedback({ targetType: "item", targetId: "item-1", category: "other", locale: "zh", turnstileToken: "token" }),
    ).rejects.toMatchObject({ name: "CurrentsApiError", message: "invalid-json", status: 200 });

    mockFetch(() => jsonResponse(200, { ok: false }));
    await expect(
      submitFeedback({ targetType: "item", targetId: "item-1", category: "other", locale: "zh", turnstileToken: "token" }),
    ).rejects.toMatchObject({ message: "invalid-json", status: 200 });
  });

  it("site 反馈同样强制携带 Turnstile token，并保留后端错误码", async () => {
    const fetchMock = vi.fn(() => jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await submitSiteFeedback({
      category: "product_bug",
      message: "  details  ",
      locale: "zh",
      pagePath: "/zh/feedback",
      turnstileToken: "site-token",
    });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      targetType: "site",
      message: "details",
      turnstileToken: "site-token",
    });

    mockFetch(() => jsonResponse(503, { error: "verification_unavailable" }));
    await expect(submitSiteFeedback({
      category: "other",
      message: "details",
      locale: "en",
      turnstileToken: "expired-token",
    })).rejects.toMatchObject({ status: 503, code: "verification_unavailable" });
  });
});

describe("feedback deadlines and response trust boundary", () => {
  afterEach(() => vi.restoreAllMocks());
  const submit = (target: "site" | "item" | "event", signal?: AbortSignal) => target === "site"
    ? submitSiteFeedback({ category: "other", message: "details", locale: "zh", turnstileToken: "token" }, signal)
    : submitFeedback({ targetType: target, targetId: "fixture-1", category: "other", locale: "en", turnstileToken: "token" }, signal);

  it.each(["site", "item", "event"] as const)("%s aborts a hanging connection and never automatically retries", async (target) => {
    const deadline = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
    const fetchMock = vi.fn((_url, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal!.addEventListener("abort", () => reject(new DOMException("timeout", "AbortError")), { once: true });
    }));
    vi.stubGlobal("fetch", fetchMock);
    const result = submit(target).catch((error: unknown) => error);
    deadline.abort();
    expect(await result).toMatchObject({ message: "network-error", status: null });
    expect(timeout).toHaveBeenCalledWith(15_000);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("preserves caller cancellation as well as the deadline", async () => {
    const controller = new AbortController();
    vi.stubGlobal("fetch", vi.fn((_url, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    })));
    const result = submit("site", controller.signal).catch((error: unknown) => error);
    controller.abort();
    expect(await result).toMatchObject({ message: "network-error", status: null });
  });

  it.each([null, {ok:true, duplicate:"false"}, {ok:true, duplicate:1}])("rejects malformed success %j", async (body) => {
    mockFetch(() => jsonResponse(200, body));
    await expect(submit("event")).rejects.toMatchObject({ message: "invalid-json" });
  });

  it("keeps the deadline active while reading the response body", async () => {
    const deadline = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: () => new Promise((_resolve, reject) => {
      deadline.signal.addEventListener("abort", () => reject(new DOMException("timeout", "AbortError")), { once: true });
    }) })));
    const result = submit("item").catch((error: unknown) => error);
    await Promise.resolve();
    deadline.abort();
    expect(await result).toMatchObject({ message: "network-error", status: null });
  });
});

describe("模型榜客户端 API 运行时契约", () => {
  it("200 但 leaderboard 维度错配或 meta 缺 models → contract-error", async () => {
    mockFetch(() => jsonResponse(200, { schemaVersion: 1, category: "coding", view: "released", items: [], observing: [], meta: {} }));
    await expect(fetchModelsLeaderboard("overall", "released")).rejects.toMatchObject({
      name: "CurrentsApiError",
      message: "contract-error",
      status: 200,
    });

    mockFetch(() => jsonResponse(200, { schemaVersion: 1, scoringVersion: "mlv1", sources: [] }));
    await expect(fetchModelsMeta()).rejects.toMatchObject({ message: "contract-error", status: 200 });
  });
});

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
    ["缺 heatHistory", (() => { const v = validEventDetail(); delete (v as Partial<typeof v>).heatHistory; return v; })()],
    ["错误 heatHistory bucket", { ...validEventDetail(), heatHistory: { ...validEventDetail().heatHistory, bucketHours: 1 } }],
    ["heatHistory 点越过窗口", {
      ...validEventDetail(),
      heatHistory: {
        ...validEventDetail().heatHistory,
        points: [{ ...validEventDetail().heatHistory.points[0], bucketStart: "2026-08-08T03:00:00.000Z" }],
      },
    }],
    ["heatHistory 非递增", {
      ...validEventDetail(),
      heatHistory: {
        ...validEventDetail().heatHistory,
        points: [validEventDetail().heatHistory.points[0], validEventDetail().heatHistory.points[0]],
      },
    }],
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

  it("服务端取数携带明确超时 signal（挂死连接不占住渲染）", async () => {
    const fetchSpy = vi.fn(async () => jsonResponse(404, {}));
    vi.stubGlobal("fetch", fetchSpy);
    await serverFetchItemDetail("item-x", "zh");
    await serverFetchDailyLatest("zh");
    for (const call of fetchSpy.mock.calls as unknown as Array<[string, RequestInit]>) {
      expect(call[1]?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("Daily 主数据现在采用严格语义：超时/网络失败必须抛出 CurrentsServerFetchError", async () => {
    mockFetch(() => Promise.reject(new DOMException("timeout", "TimeoutError")));
    await expect(serverFetchDailyLatest("zh")).rejects.toBeInstanceOf(CurrentsServerFetchError);
    await expect(serverFetchDailyLatest("zh")).rejects.toMatchObject({ kind: "network" });
  });
});

describe("serverFetchDailyLatest / serverFetchDailyByDate：主数据严格故障语义（Phase 11B P1）", () => {
  it("后端明确 404 → 返回 null（真实不存在 → notFound）", async () => {
    mockFetch(() => jsonResponse(404, { error: "not_found" }));
    await expect(serverFetchDailyLatest("zh")).resolves.toBeNull();
    await expect(serverFetchDailyByDate("2026-08-11", "zh")).resolves.toBeNull();
  });

  it("超时（AbortError/TimeoutError）→ throw CurrentsServerFetchError(kind=network)，不收敛为 null", async () => {
    mockFetch(() => Promise.reject(new DOMException("The operation was aborted", "AbortError")));
    const err = await serverFetchDailyLatest("zh").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CurrentsServerFetchError);
    expect((err as CurrentsServerFetchError).kind).toBe("network");

    const errByDate = await serverFetchDailyByDate("2026-08-11", "zh").catch((e: unknown) => e);
    expect(errByDate).toBeInstanceOf(CurrentsServerFetchError);
    expect((errByDate as CurrentsServerFetchError).kind).toBe("network");
  });

  it("网络失败 → throw CurrentsServerFetchError(kind=network)", async () => {
    mockFetch(() => Promise.reject(new TypeError("fetch failed")));
    const err = await serverFetchDailyLatest("zh").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CurrentsServerFetchError);
    expect((err as CurrentsServerFetchError).kind).toBe("network");
  });

  it("429 → throw CurrentsServerFetchError(kind=http, status=429)，不收敛为 null", async () => {
    mockFetch(() => jsonResponse(429, { error: "rate_limited" }));
    const err = await serverFetchDailyLatest("zh").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CurrentsServerFetchError);
    expect((err as CurrentsServerFetchError).kind).toBe("http");
    expect((err as CurrentsServerFetchError).status).toBe(429);

    const errByDate = await serverFetchDailyByDate("2026-08-11", "zh").catch((e: unknown) => e);
    expect(errByDate).toBeInstanceOf(CurrentsServerFetchError);
    expect((errByDate as CurrentsServerFetchError).kind).toBe("http");
    expect((errByDate as CurrentsServerFetchError).status).toBe(429);
  });

  it.each([500, 502, 503])("5xx（HTTP %i）→ throw CurrentsServerFetchError(kind=http)，不收敛为 null", async (status) => {
    mockFetch(() => jsonResponse(status, { error: "internal_error" }));
    const err = await serverFetchDailyLatest("zh").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CurrentsServerFetchError);
    expect((err as CurrentsServerFetchError).kind).toBe("http");
    expect((err as CurrentsServerFetchError).status).toBe(status);
  });

  it("非法 JSON → throw CurrentsServerFetchError(kind=invalid-json)，不收敛为 null", async () => {
    mockFetch(() => new Response("<html>Bad Gateway</html>", { status: 200 }));
    const err = await serverFetchDailyLatest("zh").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CurrentsServerFetchError);
    expect((err as CurrentsServerFetchError).kind).toBe("invalid-json");

    const errByDate = await serverFetchDailyByDate("2026-08-11", "zh").catch((e: unknown) => e);
    expect(errByDate).toBeInstanceOf(CurrentsServerFetchError);
    expect((errByDate as CurrentsServerFetchError).kind).toBe("invalid-json");
  });

  it("200 + 合法 JSON → 正常返回报告对象", async () => {
    const report = { date: "2026-08-11", lead: { title: "Lead" } };
    mockFetch(() => jsonResponse(200, report));
    await expect(serverFetchDailyLatest("zh")).resolves.toEqual(report);
    await expect(serverFetchDailyByDate("2026-08-11", "zh")).resolves.toEqual(report);
  });
});

describe("serverFetchSources：辅助数据仍保持宽松 null 语义（不因 Daily 改严格而连带改动）", () => {
  it("超时/网络失败仍收敛到 null，不抛不挂死", async () => {
    mockFetch(() => Promise.reject(new DOMException("timeout", "TimeoutError")));
    await expect(serverFetchSources()).resolves.toBeNull();
  });

  it("HTTP 错误仍收敛到 null", async () => {
    mockFetch(() => jsonResponse(500, { error: "internal_error" }));
    await expect(serverFetchSources()).resolves.toBeNull();
  });

  it("200 + 合法 JSON → 正常返回", async () => {
    mockFetch(() => jsonResponse(200, { sources: [] }));
    await expect(serverFetchSources()).resolves.toEqual({ sources: [] });
  });
});

describe("serverFetchItems：列表页首屏", () => {
  it("把 locale/view/limit 编进 /v1/items，失败返回 null", async () => {
    const fetchMock = vi.fn(() =>
      jsonResponse(200, { items: [{ id: "a", title: "T" }], nextCursor: null, hasMore: false, meta: { totalApprox: 1, generatedAt: "2026-09-03T00:00:00.000Z" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await serverFetchItems({ locale: "zh", view: "selected", limit: 20 });
    expect(res?.items).toHaveLength(1);
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("/v1/items?");
    expect(url).toContain("locale=zh");
    expect(url).toContain("view=selected");
    expect(url).toContain("limit=20");

    mockFetch(() => jsonResponse(503, { error: "down" }));
    await expect(serverFetchItems({ locale: "en", view: "selected" })).resolves.toBeNull();
  });
});

describe("动态参数验证（generateMetadata/页面取数前置拦截）", () => {
  it("isValidCurrentsResourceId：后端契约同款白名单", () => {
    expect(isValidCurrentsResourceId("c23f2da60ee0dbe9e0f00d84")).toBe(true);
    expect(isValidCurrentsResourceId("00420aab-57b8-4814-bd2d-5f4ee5ed1845")).toBe(true);
    expect(isValidCurrentsResourceId("a_b-C9")).toBe(true);
    expect(isValidCurrentsResourceId("")).toBe(false);
    expect(isValidCurrentsResourceId("x".repeat(65))).toBe(false); // 限长
    expect(isValidCurrentsResourceId("bad id")).toBe(false);
    expect(isValidCurrentsResourceId("a/../b")).toBe(false);
    expect(isValidCurrentsResourceId("%2e%2e")).toBe(false);
    expect(isValidCurrentsResourceId("id?x=1")).toBe(false);
  });

  it("isValidCurrentsDailyDate：格式与真实日历日期双重校验", () => {
    expect(isValidCurrentsDailyDate("2026-08-11")).toBe(true);
    expect(isValidCurrentsDailyDate("2024-02-29")).toBe(true); // 闰年
    expect(isValidCurrentsDailyDate("2026-02-29")).toBe(false); // 非闰年
    expect(isValidCurrentsDailyDate("2026-02-30")).toBe(false);
    expect(isValidCurrentsDailyDate("2026-13-01")).toBe(false);
    expect(isValidCurrentsDailyDate("2026-00-10")).toBe(false);
    expect(isValidCurrentsDailyDate("2026-04-31")).toBe(false);
    expect(isValidCurrentsDailyDate("2026-4-1")).toBe(false); // 格式
    expect(isValidCurrentsDailyDate("20260401")).toBe(false);
    expect(isValidCurrentsDailyDate("abcd-ef-gh")).toBe(false);
  });
});
