import { CURRENTS_API_BASE, CurrentsApiError } from "./currents/api";

export const GUESTBOOK_MESSAGE_MIN = 4;
export const GUESTBOOK_MESSAGE_MAX = 500;

export interface GuestbookEntry {
  id: string;
  nickname: string;
  message: string;
  createdAt: string;
}

export interface GuestbookListResponse {
  schemaVersion: 1;
  entries: GuestbookEntry[];
  nextCursor: string | null;
}

export interface GuestbookCreateResponse {
  ok: true;
  duplicate?: boolean;
  entry?: GuestbookEntry;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isGuestbookEntry(value: unknown): value is GuestbookEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.nickname === "string" &&
    value.nickname.length > 0 &&
    typeof value.message === "string" &&
    typeof value.createdAt === "string"
  );
}

export function isGuestbookListResponse(value: unknown): value is GuestbookListResponse {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== 1 || !Array.isArray(value.entries)) return false;
  if (value.nextCursor !== null && typeof value.nextCursor !== "string") return false;
  return value.entries.every(isGuestbookEntry);
}

function clientApiBase(): string {
  if (typeof window !== "undefined") {
    const override = (window as unknown as Record<string, unknown>).__CURRENTS_API_BASE;
    if (typeof override === "string" && override) return override;
  }
  return CURRENTS_API_BASE;
}

async function readError(res: Response): Promise<CurrentsApiError> {
  let code: string | null = null;
  let retryAfterSeconds: number | null = null;
  try {
    const body = (await res.json()) as { error?: unknown; retryAfterSeconds?: unknown };
    if (typeof body.error === "string") code = body.error;
    if (typeof body.retryAfterSeconds === "number" && Number.isFinite(body.retryAfterSeconds)) {
      retryAfterSeconds = Math.max(0, Math.floor(body.retryAfterSeconds));
    }
  } catch {
    // keep HTTP status
  }
  const headerRetry = res.headers.get("retry-after");
  if (retryAfterSeconds === null && headerRetry && /^\d+$/.test(headerRetry)) {
    retryAfterSeconds = Number(headerRetry);
  }
  return new CurrentsApiError(`http-${res.status}`, res.status, code, retryAfterSeconds);
}

export function sanitizeGuestbookMessage(raw: string): string {
  return raw.replace(/\r\n/g, "\n").trim();
}

export function guestbookMessageError(message: string): "required" | "tooLong" | null {
  if (message.length < GUESTBOOK_MESSAGE_MIN) return "required";
  if (message.length > GUESTBOOK_MESSAGE_MAX) return "tooLong";
  return null;
}

/**
 * 列表读取。浏览器侧（重新加载按钮）要最新数据，走 no-store；
 * 服务端首屏必须传 revalidate，否则 no-store 会把整个路由拖成动态渲染，
 * 每次访问都实时打后端，并且共用一个服务器 IP 的限流桶。
 */
export async function fetchGuestbookEntries(
  opts: { limit?: number; cursor?: string | null; signal?: AbortSignal; revalidate?: number } = {},
): Promise<GuestbookListResponse> {
  const params = new URLSearchParams({ limit: String(opts.limit ?? 20) });
  if (opts.cursor) params.set("cursor", opts.cursor);
  const timeout = AbortSignal.timeout(10_000);
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
  let res: Response;
  try {
    res = await fetch(`${clientApiBase()}/v1/guestbook?${params.toString()}`, {
      signal,
      headers: { Accept: "application/json" },
      ...(typeof opts.revalidate === "number"
        ? { next: { revalidate: opts.revalidate } }
        : { cache: "no-store" as const }),
    });
  } catch {
    throw new CurrentsApiError("network-error", null);
  }
  if (!res.ok) throw await readError(res);
  let value: unknown;
  try {
    value = await res.json();
  } catch {
    throw new CurrentsApiError("invalid-json", res.status);
  }
  if (!isGuestbookListResponse(value)) throw new CurrentsApiError("contract-error", res.status);
  return value;
}

export async function submitGuestbookEntry(
  params: {
    message: string;
    locale: "zh" | "en";
    turnstileToken: string;
    website?: string;
  },
  signal?: AbortSignal,
): Promise<GuestbookCreateResponse> {
  const timeout = AbortSignal.timeout(15_000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let res: Response;
  try {
    res = await fetch(`${clientApiBase()}/v1/guestbook`, {
      method: "POST",
      signal: requestSignal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        message: sanitizeGuestbookMessage(params.message),
        locale: params.locale,
        turnstileToken: params.turnstileToken,
        ...(params.website ? { website: params.website } : {}),
      }),
    });
  } catch {
    throw new CurrentsApiError("network-error", null);
  }
  if (!res.ok) throw await readError(res);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new CurrentsApiError("invalid-json", res.status);
  }
  if (!isRecord(body) || body.ok !== true) {
    throw new CurrentsApiError("invalid-json", res.status);
  }
  if (body.duplicate !== undefined && typeof body.duplicate !== "boolean") {
    throw new CurrentsApiError("invalid-json", res.status);
  }
  if (body.entry !== undefined && !isGuestbookEntry(body.entry)) {
    throw new CurrentsApiError("contract-error", res.status);
  }
  return {
    ok: true,
    ...(body.duplicate === true ? { duplicate: true } : {}),
    ...(isGuestbookEntry(body.entry) ? { entry: body.entry } : {}),
  };
}
