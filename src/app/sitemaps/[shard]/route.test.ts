import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "./route";

/**
 * /sitemaps/[shard] route 层缓存与故障边界（lib 层逻辑已在 src/lib/sitemap.test.ts 覆盖）：
 * - 未知分片 404；
 * - 上游失败 → 503 + no-store + Retry-After（不缓存故障）；
 * - 成功 → XML + s-maxage 缓存。
 */

function call(shard: string): Promise<Response> {
  return GET(new Request(`https://ethanpier.com/sitemaps/${shard}`), {
    params: Promise.resolve({ shard }),
  });
}

function callWithSearch(shard: string, search: string): Promise<Response> {
  return GET(new Request(`https://ethanpier.com/sitemaps/${shard}${search}`), {
    params: Promise.resolve({ shard }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /sitemaps/[shard]", () => {
  it("未知分片名 404（含越界前缀与任意文件名）", async () => {
    for (const shard of ["currents-events-z.xml", "currents-events-.xml", "evil.xml", "static.xml.bak"]) {
      const res = await call(shard);
      expect(res.status, shard).toBe(404);
    }
  });

  it("上游故障 → 503 + no-store + Retry-After，故障不进 CDN 缓存", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("err", { status: 502 })));
    for (const shard of ["currents-items.xml", "currents-models.xml", "currents-events-0.xml", "currents-events-other.xml"]) {
      const res = await call(shard);
      expect(res.status, shard).toBe(503);
      expect(res.headers.get("cache-control"), shard).toBe("no-store");
      expect(res.headers.get("retry-after"), shard).toBe("300");
    }
  });

  it("上游网络异常同样 503 + no-store（挂死连接由 10s AbortSignal.timeout 收敛）", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("network down"))));
    const res = await call("currents-events-a.xml");
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("成功分片输出 XML + 稳定 CDN 缓存头", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            schemaVersion: 1,
            events: [{ eventId: "0abc", lastActivityAt: "2026-08-10T00:00:00.000Z" }],
            nextCursor: null,
            hasMore: false,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    const res = await call("currents-events-0.xml");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/xml; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    );
    const xml = await res.text();
    expect(xml).toContain("/currents/events/0abc");
  });
});

describe("GET /sitemaps/[shard] — 非空 query 一律拒绝（缓存绕过防护）", () => {
  it("任意 query（含 nonce）400 + no-store，且不触发任何上游 fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    for (const search of [
      "?nonce=abc123",
      "?nonce=",
      "?a=1&b=2",
      "?" + "x".repeat(500),
    ]) {
      const res = await callWithSearch("currents-items.xml", search);
      expect(res.status, search).toBe(400);
      expect(res.headers.get("cache-control"), search).toBe("no-store");
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("query 拒绝在分片名校验之前生效：未知分片 + query 仍是 400 而非 404", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await callWithSearch("evil.xml", "?nonce=x");
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("事件分片带 query 同样 400 + no-store + 零 fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await callWithSearch("currents-events-0.xml", "?nonce=cache-bust");
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("无 query 的正常请求不受影响（回归）", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ schemaVersion: 1, events: [], nextCursor: null, hasMore: false }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    const res = await call("currents-events-0.xml");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    );
  });
});
