import { afterEach, describe, expect, it, vi } from "vitest";
import { CurrentsApiError } from "./currents/api";
import {
  fetchGuestbookEntries,
  guestbookMessageError,
  isGuestbookListResponse,
  sanitizeGuestbookMessage,
  submitGuestbookEntry,
} from "./guestbook";

function jsonResponse(status: number, body: unknown, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("guestbook message guards", () => {
  it("trim 并拒绝过短 / 过长", () => {
    expect(sanitizeGuestbookMessage("  你好世界  ")).toBe("你好世界");
    expect(guestbookMessageError("abc")).toBe("required");
    expect(guestbookMessageError("abcd")).toBeNull();
    expect(guestbookMessageError("字".repeat(501))).toBe("tooLong");
  });

  it("列表契约拒绝半成品", () => {
    expect(isGuestbookListResponse({ schemaVersion: 1, entries: [], nextCursor: null })).toBe(true);
    expect(isGuestbookListResponse({ schemaVersion: 1, entries: [{ id: "1" }], nextCursor: null })).toBe(false);
  });
});

describe("guestbook HTTP", () => {
  it("GET 列表走 no-store 并校验契约", async () => {
    const fetchMock = vi.fn(() =>
      jsonResponse(200, {
        schemaVersion: 1,
        entries: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            nickname: "Visitor_ab12",
            message: "潮水留下的字",
            createdAt: "2026-09-09T14:00:00.000Z",
          },
        ],
        nextCursor: null,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchGuestbookEntries({ limit: 20 });
    expect(result.entries).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/v1/guestbook?limit=20");
    expect(init.cache).toBe("no-store");
  });

  it("POST 成功返回 entry；429 保留 retryAfterSeconds", async () => {
    const fetchMock = vi.fn(() =>
      jsonResponse(200, {
        ok: true,
        entry: {
          id: "22222222-2222-4222-8222-222222222222",
          nickname: "Visitor_cd34",
          message: "漂来一只瓶子",
          createdAt: "2026-09-09T14:01:00.000Z",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      submitGuestbookEntry({
        message: "  漂来一只瓶子  ",
        locale: "zh",
        turnstileToken: "token",
      }),
    ).resolves.toMatchObject({ ok: true, entry: { message: "漂来一只瓶子" } });
    expect(JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toEqual({
      message: "漂来一只瓶子",
      locale: "zh",
      turnstileToken: "token",
    });

    vi.stubGlobal("fetch", vi.fn(() => jsonResponse(429, { error: "rate_limited", retryAfterSeconds: 120 })));
    const err = await submitGuestbookEntry({
      message: "too many",
      locale: "en",
      turnstileToken: "token",
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CurrentsApiError);
    expect((err as CurrentsApiError).status).toBe(429);
    expect((err as CurrentsApiError).retryAfterSeconds).toBe(120);
  });
});
