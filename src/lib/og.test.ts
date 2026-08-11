import { describe, it, expect, vi, afterEach } from "vitest";
import { parseOgParams, resolveOgData, MAX_OG_TITLE_LENGTH, MAX_OG_DESCRIPTION_LENGTH } from "./og";
import { CurrentsServerFetchError } from "./currents/api";

function params(query: Record<string, string | string[]>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const v of Array.isArray(value) ? value : [value]) sp.append(key, v);
  }
  return sp;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("parseOgParams：只接受稳定资源标识", () => {
  it("四种合法请求形态", () => {
    expect(parseOgParams(params({ type: "site" }))).toEqual({ type: "site" });
    expect(parseOgParams(params({ type: "blog", locale: "zh", slug: "nextjs-ssg-cold-start" }))).toEqual({
      type: "blog",
      locale: "zh",
      slug: "nextjs-ssg-cold-start",
    });
    expect(parseOgParams(params({ type: "currents-item", locale: "en", id: "c23f2da60ee0dbe9e0f00d84" }))).toEqual({
      type: "currents-item",
      locale: "en",
      id: "c23f2da60ee0dbe9e0f00d84",
    });
    expect(
      parseOgParams(params({ type: "currents-event", locale: "zh", eventId: "00420aab-57b8-4814-bd2d-5f4ee5ed1845" })),
    ).toEqual({ type: "currents-event", locale: "zh", eventId: "00420aab-57b8-4814-bd2d-5f4ee5ed1845" });
  });

  it("旧式任意文案参数（title/description/tags/readMin）一律拒绝", () => {
    expect(parseOgParams(params({ title: "Phishing Bank Login" }))).toBeNull();
    expect(parseOgParams(params({ type: "site", title: "Injected" }))).toBeNull();
    expect(parseOgParams(params({ type: "blog", locale: "zh", slug: "a-post", description: "x" }))).toBeNull();
    expect(parseOgParams(params({ type: "currents-item", locale: "zh", id: "abc", tags: "Evil" }))).toBeNull();
    expect(parseOgParams(params({ type: "currents-event", locale: "zh", eventId: "abc", readMin: "5" }))).toBeNull();
  });

  it("类型、locale、slug、ID 严格校验与限长", () => {
    expect(parseOgParams(params({}))).toBeNull(); // 无 type
    expect(parseOgParams(params({ type: "unknown" }))).toBeNull();
    expect(parseOgParams(params({ type: "blog", locale: "fr", slug: "a" }))).toBeNull(); // 非法 locale
    expect(parseOgParams(params({ type: "blog", locale: "zh", slug: "UPPER" }))).toBeNull(); // slug 字符集
    expect(parseOgParams(params({ type: "blog", locale: "zh", slug: "a".repeat(121) }))).toBeNull(); // slug 限长
    expect(parseOgParams(params({ type: "blog", locale: "zh", slug: "../etc" }))).toBeNull(); // 路径穿越字符
    expect(parseOgParams(params({ type: "currents-item", locale: "zh", id: "bad id!" }))).toBeNull();
    expect(parseOgParams(params({ type: "currents-item", locale: "zh", id: "x".repeat(65) }))).toBeNull();
    expect(parseOgParams(params({ type: "currents-event", locale: "zh", eventId: "" }))).toBeNull();
    // 缺参数
    expect(parseOgParams(params({ type: "blog", locale: "zh" }))).toBeNull();
    expect(parseOgParams(params({ type: "currents-item", id: "abc" }))).toBeNull();
  });

  it("重复参数拒绝（防 CDN 缓存键污染）", () => {
    expect(parseOgParams(params({ type: "blog", locale: "zh", slug: ["real-post", "other-post"] }))).toBeNull();
    expect(parseOgParams(params({ type: ["site", "blog"] }))).toBeNull();
  });
});

describe("resolveOgData：从可信来源解析内容", () => {
  it("site：固定站点卡片，不含任何请求可控文案", async () => {
    await expect(resolveOgData({ type: "site" })).resolves.toEqual({
      title: "Pier — Frontend Engineer",
      description: "Personal blog and portfolio by Ethan Pier",
      tags: [],
    });
  });

  it("blog：从仓库文章解析（真实文章），未知 slug 返回 null", async () => {
    const data = await resolveOgData({ type: "blog", locale: "zh", slug: "nextjs-ssg-cold-start" });
    expect(data).not.toBeNull();
    expect(data!.title.length).toBeGreaterThan(0);
    expect(data!.title.length).toBeLessThanOrEqual(MAX_OG_TITLE_LENGTH);
    expect(Number(data!.readMin)).toBeGreaterThan(0);

    await expect(resolveOgData({ type: "blog", locale: "zh", slug: "does-not-exist" })).resolves.toBeNull();
  });

  it("currents-item：上游 200 → 卡片数据（限长清洗）；上游 404 → null", async () => {
    const longTitle = "T".repeat(500);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ title: longTitle, summary: "S".repeat(500), reason: null, tags: ["AI", "", "x".repeat(64)] }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    const data = await resolveOgData({ type: "currents-item", locale: "zh", id: "abc123" });
    expect(data!.title.length).toBe(MAX_OG_TITLE_LENGTH);
    expect(data!.description.length).toBe(MAX_OG_DESCRIPTION_LENGTH);
    expect(data!.tags).toEqual(["AI", "x".repeat(32)]); // 空 tag 剔除、单 tag 限长

    vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));
    await expect(resolveOgData({ type: "currents-item", locale: "zh", id: "abc123" })).resolves.toBeNull();
  });

  it("上游 5xx/网络故障：向上抛 CurrentsServerFetchError，不得变成 null（404）", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("oops", { status: 503 })));
    await expect(resolveOgData({ type: "currents-item", locale: "zh", id: "abc123" })).rejects.toBeInstanceOf(
      CurrentsServerFetchError,
    );

    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    await expect(
      resolveOgData({ type: "currents-event", locale: "zh", eventId: "00420aab-57b8-4814-bd2d-5f4ee5ed1845" }),
    ).rejects.toBeInstanceOf(CurrentsServerFetchError);
  });
});
