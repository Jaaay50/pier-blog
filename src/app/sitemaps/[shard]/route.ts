import {
  buildEventsShardEntries,
  buildItemsShardEntries,
  buildUrlsetXml,
  EVENT_SHARD_PREFIXES,
  type EventShardPrefix,
} from "@/lib/sitemap";

/**
 * /sitemaps/[shard] — 依赖后端 API 的 sitemap 分片 dispatcher。
 * （static.xml 是独立的 force-static 字面路由，构建期生成，不经过这里。）
 *
 * - currents-items.xml 与 currents-events-*.xml 运行时向后端全量取数，
 *   成功响应带 s-maxage + stale-while-revalidate（CDN 缓存、后台刷新）；
 *   任何取数失败/契约违反 → 503 + no-store：不缓存故障、不输出半成品，
 *   搜索引擎按暂时故障处理并保留上一版本，稍后重试。
 * - 未知分片名 404。
 */
export const dynamic = "force-dynamic";

const OK_CACHE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const FAIL_CACHE = "no-store";

/** 每次上游取数的独立超时：挂死的后端连接转化为明确的 503，而不是函数超时。 */
const FETCH_TIMEOUT_MS = 10_000;
const fetchWithTimeout: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": OK_CACHE,
    },
  });
}

function unavailableResponse(): Response {
  return new Response("sitemap shard temporarily unavailable\n", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": FAIL_CACHE,
      "Retry-After": "300",
    },
  });
}

const EVENT_SHARD_RE = /^currents-events-([0-9a-f]|other)\.xml$/;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ shard: string }> }
) {
  const { shard } = await params;

  // Phase 11B P1: 阻断非空 query 的缓存绕过企图（?nonce= 等）。
  // 正常 sitemap 请求为裸路径；query 存在即为异常，立即 400 + no-store，不触发上游请求。
  const url = new URL(req.url);
  if (url.search !== '') {
    return new Response('sitemap does not accept query parameters\n', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': FAIL_CACHE,
      },
    });
  }

  if (shard === "currents-items.xml") {
    try {
      return xmlResponse(buildUrlsetXml(await buildItemsShardEntries(fetchWithTimeout)));
    } catch {
      return unavailableResponse();
    }
  }

  const eventMatch = EVENT_SHARD_RE.exec(shard);
  if (eventMatch) {
    const prefix = eventMatch[1] as EventShardPrefix;
    if (!EVENT_SHARD_PREFIXES.includes(prefix)) {
      return new Response("not found\n", { status: 404 });
    }
    try {
      return xmlResponse(buildUrlsetXml(await buildEventsShardEntries(prefix, fetchWithTimeout)));
    } catch {
      return unavailableResponse();
    }
  }

  return new Response("not found\n", { status: 404 });
}
