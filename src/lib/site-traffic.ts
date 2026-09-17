import { CURRENTS_API_BASE } from "@/lib/currents/api";

export const VISITOR_COOKIE = "visitor_id";
export const SESSION_COOKIE = "visit_sid";
export const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;
export const SESSION_IDLE_SECONDS = 30 * 60;

export function trafficCollectUrl(): string {
  if (typeof window !== "undefined") {
    const override = (window as unknown as Record<string, unknown>).__CURRENTS_API_BASE;
    if (typeof override === "string" && override) {
      return `${override.replace(/\/$/, "")}/v1/traffic/collect`;
    }
  }
  return `${CURRENTS_API_BASE.replace(/\/$/, "")}/v1/traffic/collect`;
}

export function randomTrafficId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function declinedBrowserTracking(): boolean {
  if (typeof navigator === "undefined") return false;
  const dnt = String(
    (navigator as Navigator & { doNotTrack?: string }).doNotTrack ??
      (window as Window & { doNotTrack?: string }).doNotTrack ??
      "",
  );
  const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
  return dnt === "1" || gpc === true;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function writeCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function trafficIds(): { visitorId?: string; sessionId?: string } {
  if (declinedBrowserTracking()) return {};
  let visitorId = readCookie(VISITOR_COOKIE);
  if (!visitorId) visitorId = randomTrafficId();
  writeCookie(VISITOR_COOKIE, visitorId, VISITOR_MAX_AGE);
  if (readCookie(VISITOR_COOKIE) !== visitorId) return {};
  let sessionId = readCookie(SESSION_COOKIE);
  if (!sessionId) sessionId = randomTrafficId();
  writeCookie(SESSION_COOKIE, sessionId, SESSION_IDLE_SECONDS);
  if (readCookie(SESSION_COOKIE) !== sessionId) return { visitorId };
  return { visitorId, sessionId };
}

export function shouldSkipTrafficPath(pathname: string): boolean {
  return pathname.startsWith("/api") || pathname.startsWith("/og") || pathname === "/health";
}

export function sendSiteVisit(pathname: string): void {
  if (typeof window === "undefined") return;
  if (document.visibilityState === "hidden") return;
  if (shouldSkipTrafficPath(pathname)) return;
  const payload = JSON.stringify({
    site: "blog",
    path: pathname,
    referrer: document.referrer || undefined,
    ...trafficIds(),
  });
  const url = trafficCollectUrl();
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
    mode: "cors",
  }).catch(() => {
    /* 打点失败不影响打开 */
  });
}
