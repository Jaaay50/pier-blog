import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function ogRequest(query: string): NextRequest {
  return new NextRequest(`https://ethanpier.com/og${query}`);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /og：拒绝任意文案反射", () => {
  it("旧式 title/description/tags/readMin 参数返回 400 + no-store，不渲染任何内容", async () => {
    const cases = [
      "?title=Fake%20Security%20Alert&description=Call%20now",
      "?title=Phish",
      "?type=site&title=Injected",
      "?type=blog&locale=zh&slug=nextjs-ssg-cold-start&readMin=99",
    ];
    for (const query of cases) {
      const res = await GET(ogRequest(query));
      expect(res.status, query).toBe(400);
      expect(res.headers.get("cache-control"), query).toBe("no-store");
      expect(res.headers.get("content-type"), query).toContain("text/plain");
      const body = await res.text();
      expect(body).not.toContain("Fake");
      expect(body).not.toContain("Phish");
      expect(body).not.toContain("Injected");
    }
  });

  it("非法 type/locale/slug/ID 返回 400", async () => {
    for (const query of [
      "",
      "?type=unknown",
      "?type=blog&locale=fr&slug=a",
      "?type=blog&locale=zh&slug=../../etc/passwd",
      "?type=currents-item&locale=zh&id=bad%20id",
      "?type=currents-event&locale=zh&eventId=" + "x".repeat(65),
    ]) {
      const res = await GET(ogRequest(query));
      expect(res.status, query || "(empty)").toBe(400);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
  });
});

describe("GET /og：资源解析与缓存边界", () => {
  it("未知博客 slug 返回 404 + no-store", async () => {
    const res = await GET(ogRequest("?type=blog&locale=zh&slug=this-post-does-not-exist"));
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("上游故障返回 503 + no-store（不得缓存成 404）", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("err", { status: 500 })));
    const res = await GET(ogRequest("?type=currents-item&locale=zh&id=abc123"));
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");

    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("network down"))));
    const res2 = await GET(ogRequest("?type=currents-event&locale=zh&eventId=abc-def"));
    expect(res2.status).toBe(503);
    expect(res2.headers.get("cache-control")).toBe("no-store");
  });

  it("上游明确 404（资源不存在）返回 404 + no-store", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));
    const res = await GET(ogRequest("?type=currents-item&locale=en&id=gone999"));
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("site 卡片成功渲染 PNG，带稳定 CDN 缓存策略", async () => {
    const res = await GET(ogRequest("?type=site"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    );
    const bytes = new Uint8Array(await res.arrayBuffer());
    // PNG magic
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("blog 卡片从仓库文章渲染成功", async () => {
    const res = await GET(ogRequest("?type=blog&locale=en&slug=nextjs-ssg-cold-start"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
  });
});
