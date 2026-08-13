import { describe, it, expect, vi } from "vitest";
import {
  buildEventsShardEntries,
  buildItemsShardEntries,
  buildModelsShardEntries,
  buildStaticShardEntries,
  buildSitemapIndexXml,
  buildUrlsetXml,
  escapeXml,
  EVENT_SHARD_PREFIXES,
  SITE_URL,
  SITEMAP_SHARD_NAMES,
  SitemapShardError,
  type SitemapUrlEntry,
} from "./sitemap";

/* ─────────────── XML 构造 ─────────────── */

describe("XML 构造", () => {
  it("escapeXml 转义全部五个保留字符", () => {
    expect(escapeXml(`a&b<c>d"e'f`)).toBe("a&amp;b&lt;c&gt;d&quot;e&apos;f");
  });

  it("urlset 输出合法 XML：声明、命名空间、双语 alternate 与 x-default", () => {
    const entries: SitemapUrlEntry[] = [
      {
        loc: `${SITE_URL}/en/currents/events/ev-1`,
        lastmod: "2026-08-09T23:47:24.000Z",
        changefreq: "hourly",
        priority: 0.6,
        alternates: {
          en: `${SITE_URL}/en/currents/events/ev-1`,
          zh: `${SITE_URL}/zh/currents/events/ev-1`,
        },
      },
    ];
    const xml = buildUrlsetXml(entries);
    expect(xml).toContain(`<?xml version="1.0" encoding="UTF-8"?>`);
    expect(xml).toContain(`xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`);
    expect(xml).toContain(`xmlns:xhtml="http://www.w3.org/1999/xhtml"`);
    expect(xml).toContain(`<loc>${SITE_URL}/en/currents/events/ev-1</loc>`);
    expect(xml).toContain(`hreflang="en" href="${SITE_URL}/en/currents/events/ev-1"`);
    expect(xml).toContain(`hreflang="zh" href="${SITE_URL}/zh/currents/events/ev-1"`);
    expect(xml).toContain(`hreflang="x-default" href="${SITE_URL}/en/currents/events/ev-1"`);
    expect(xml).toContain(`<lastmod>2026-08-09T23:47:24.000Z</lastmod>`);
    expect(xml).toContain(`<changefreq>hourly</changefreq>`);
    expect(xml).toContain(`<priority>0.6</priority>`);
    expect(xml.endsWith("</urlset>\n")).toBe(true);
  });

  it("sitemap index 输出全部分片且 XML 合法", () => {
    const xml = buildSitemapIndexXml(SITEMAP_SHARD_NAMES.map((n) => `${SITE_URL}/sitemaps/${n}`));
    expect(xml).toContain("<sitemapindex");
    // 3 个基础/模型分片 + 17 个事件分片
    expect(SITEMAP_SHARD_NAMES.length).toBe(20);
    for (const name of SITEMAP_SHARD_NAMES) {
      expect(xml).toContain(`<loc>${SITE_URL}/sitemaps/${name}</loc>`);
    }
  });
});

describe("models 分片", () => {
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
    models: [
      { slug: "gpt-5-6-sol", name: "GPT-5.6 Sol", vendor: "OpenAI", vendorId: "openai", status: "released", releaseDate: "2026-07-09" },
      { slug: "gpt-5-6-sol", name: "duplicate", vendor: "OpenAI", vendorId: "openai", status: "released", releaseDate: "2026-07-09" },
      { slug: "gemini-3-1-pro", name: "Gemini 3.1 Pro", vendor: "Google", vendorId: "google", status: "preview", releaseDate: null },
    ],
    modelCounts: { released: 1, preview: 1 },
    pendingCount: 0,
    computedAt: null,
    generatedAt: "2026-08-13T00:00:00.000Z",
  };

  it("从 meta 注册表去重并生成双语详情 URL；故障整片失败", async () => {
    const ok = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, meta));
    const entries = await buildModelsShardEntries(ok);
    expect(entries).toHaveLength(4);
    expect(entries.map((entry) => entry.loc)).toContain(`${SITE_URL}/en/currents/models/gpt-5-6-sol`);
    expect(entries.map((entry) => entry.loc)).toContain(`${SITE_URL}/zh/currents/models/gemini-3-1-pro`);

    const bad = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { ...meta, models: undefined }));
    await expect(buildModelsShardEntries(bad)).rejects.toThrow(SitemapShardError);
  });
});

/* ─────────────── static 分片 ─────────────── */

describe("static 分片", () => {
  it("包含全部静态页/主题页/博客文章，URL 无重复，全部带双语 alternate", () => {
    const entries = buildStaticShardEntries();
    const locs = entries.map((e) => e.loc);
    expect(new Set(locs).size).toBe(locs.length);
    expect(locs).toContain(`${SITE_URL}/en`);
    expect(locs).toContain(`${SITE_URL}/zh/currents/hot`);
    expect(locs).toContain(`${SITE_URL}/en/currents/topics/openai`);
    for (const e of entries) {
      expect(e.alternates).toBeDefined();
      expect(e.loc.startsWith(`${SITE_URL}/en`) || e.loc.startsWith(`${SITE_URL}/zh`)).toBe(true);
    }
    // en/zh 成对
    const enCount = locs.filter((l) => l.startsWith(`${SITE_URL}/en`)).length;
    const zhCount = locs.filter((l) => l.startsWith(`${SITE_URL}/zh`)).length;
    expect(enCount).toBe(zhCount);

    const entry = (path: string) =>
      entries.find((item) => item.loc === `${SITE_URL}/en${path}`);
    expect(entry("/currents/changelog")?.lastmod).toBe(
      "2026-08-13T00:00:00.000Z",
    );
    expect(entry("/currents/agent")?.lastmod).toBe(
      "2026-08-11T00:00:00.000Z",
    );
    expect(entry("/feedback")?.lastmod).toBe("2026-08-11T00:00:00.000Z");
  });
});

/* ─────────────── 事件分片取数 ─────────────── */

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function eventsPage(
  events: Array<{ eventId: string; lastActivityAt: string }>,
  nextCursor: string | null
) {
  return {
    schemaVersion: 1,
    prefix: "a",
    events,
    nextCursor,
    hasMore: nextCursor !== null,
    total: 0,
    meta: { generatedAt: new Date().toISOString() },
  };
}

describe("事件分片", () => {
  it("多页遍历完整拼接：跨页无重复、双语成对、lastmod 原样透传", async () => {
    const page1 = eventsPage(
      [
        { eventId: "a0001", lastActivityAt: "2026-08-09T23:47:24.000Z" },
        { eventId: "a0002", lastActivityAt: "2026-08-08T10:00:00.000Z" },
      ],
      "a0002"
    );
    const page2 = eventsPage([{ eventId: "a0003", lastActivityAt: "2026-08-07T00:00:00.000Z" }], null);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, page1))
      .mockResolvedValueOnce(jsonResponse(200, page2));

    const entries = await buildEventsShardEntries("a", fetchMock);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const url1 = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url1.pathname).toBe("/v1/sitemap/events");
    expect(url1.searchParams.get("prefix")).toBe("a");
    const url2 = new URL(String(fetchMock.mock.calls[1]![0]));
    expect(url2.searchParams.get("cursor")).toBe("a0002");

    // 3 事件 × 2 locale = 6 条，无重复
    expect(entries.length).toBe(6);
    const locs = entries.map((e) => e.loc);
    expect(new Set(locs).size).toBe(6);
    expect(locs).toContain(`${SITE_URL}/en/currents/events/a0001`);
    expect(locs).toContain(`${SITE_URL}/zh/currents/events/a0001`);
    const first = entries.find((e) => e.loc.endsWith("/en/currents/events/a0001"))!;
    expect(first.lastmod).toBe("2026-08-09T23:47:24.000Z");
    expect(first.alternates).toEqual({
      en: `${SITE_URL}/en/currents/events/a0001`,
      zh: `${SITE_URL}/zh/currents/events/a0001`,
    });
  });

  it("跨时区 lastmod 归一为 UTC ISO；无效 lastmod 省略字段而不是补造", async () => {
    const page = eventsPage(
      [
        { eventId: "a0001", lastActivityAt: "2026-08-10T07:00:00+08:00" },
        { eventId: "a0002", lastActivityAt: "not-a-date" },
      ],
      null
    );
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, page));
    const entries = await buildEventsShardEntries("a", fetchMock);
    const withTz = entries.find((e) => e.loc.endsWith("/en/currents/events/a0001"))!;
    expect(withTz.lastmod).toBe("2026-08-09T23:00:00.000Z");
    const invalid = entries.find((e) => e.loc.endsWith("/en/currents/events/a0002"))!;
    expect(invalid.lastmod).toBeUndefined();
  });

  it("上游分页中途 5xx：整片抛 SitemapShardError，不输出半成品", async () => {
    const page1 = eventsPage([{ eventId: "a0001", lastActivityAt: "2026-08-09T00:00:00.000Z" }], "a0001");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, page1))
      .mockResolvedValueOnce(jsonResponse(503, { error: "internal_error" }));
    await expect(buildEventsShardEntries("a", fetchMock)).rejects.toThrow(SitemapShardError);
  });

  it("契约违反（schemaVersion 不符 / events 非数组 / hasMore 无 cursor）一律整片失败", async () => {
    const cases = [
      { ...eventsPage([], null), schemaVersion: 2 },
      { ...eventsPage([], null), events: "nope" },
      { ...eventsPage([], null), hasMore: true, nextCursor: null },
    ];
    for (const body of cases) {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, body));
      await expect(buildEventsShardEntries("a", fetchMock)).rejects.toThrow(SitemapShardError);
    }
  });

  it("非法 JSON 与网络异常向上抛（route handler 层转 503）", async () => {
    const badJson = new Response("<html>gateway error</html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(badJson);
    await expect(buildEventsShardEntries("a", fetchMock)).rejects.toThrow(SitemapShardError);

    const netFail = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
    await expect(buildEventsShardEntries("a", netFail)).rejects.toThrow();
  });

  it("空分片输出零条目（后端该前缀无事件属正常状态，不是错误）", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, eventsPage([], null)));
    const entries = await buildEventsShardEntries("other", fetchMock);
    expect(entries).toEqual([]);
  });

  it("分页永不收敛时抛错而不是死循环/静默截断", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation((input) => {
        const url = new URL(String(input));
        const cursor = url.searchParams.get("cursor") ?? "seed";
        return Promise.resolve(
          jsonResponse(200, eventsPage([{ eventId: `${cursor}x`, lastActivityAt: "2026-08-09T00:00:00.000Z" }], `${cursor}x`))
        );
      });
    await expect(buildEventsShardEntries("a", fetchMock)).rejects.toThrow(/did not converge/);
  });

  it("分片前缀清单：16 hex + other 防御片", () => {
    expect(EVENT_SHARD_PREFIXES.length).toBe(17);
    expect(EVENT_SHARD_PREFIXES).toContain("other");
  });
});

/* ─────────────── items 分片 ─────────────── */

describe("items 分片", () => {
  it("保持既有 ≤500 语义并去重；API 故障整片失败", async () => {
    const items = Array.from({ length: 3 }, (_, i) => ({
      id: `item-${i}`,
      publishedAt: "2026-08-09T00:00:00.000Z",
    }));
    const ok = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(200, { items, nextCursor: null, hasMore: false })
    );
    const entries = await buildItemsShardEntries(ok);
    expect(entries.length).toBe(6); // 3 × 2 locale
    expect(new Set(entries.map((e) => e.loc)).size).toBe(6);

    const fail = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(500, { error: "x" }));
    await expect(buildItemsShardEntries(fail)).rejects.toThrow(SitemapShardError);
  });
});
