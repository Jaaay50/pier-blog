/**
 * 列表密度偏好：localStorage 记录紧凑 / 标准 / 宽松。
 * 结构 / SSR 安全 / 跨 tab 同步参照 readState.ts。
 */
export type Density = "compact" | "standard" | "comfortable";

const KEY = "pier-currents-density-v1";
const VALID: Density[] = ["compact", "standard", "comfortable"];
export const DEFAULT_DENSITY: Density = "standard";

function safeWindow(): Window | null {
  return typeof window === "undefined" ? null : window;
}

export function isDensity(v: unknown): v is Density {
  return typeof v === "string" && (VALID as string[]).includes(v);
}

export function getDensity(): Density {
  const w = safeWindow();
  if (!w) return DEFAULT_DENSITY;
  try {
    const raw = w.localStorage.getItem(KEY);
    return isDensity(raw) ? raw : DEFAULT_DENSITY;
  } catch {
    return DEFAULT_DENSITY;
  }
}

/** 同步 <html data-density>，供 CSS 变量分档；SSR / 取值为默认时移除属性 */
export function applyDensityAttr(d: Density): void {
  if (typeof document === "undefined") return;
  if (d === DEFAULT_DENSITY) document.documentElement.removeAttribute("data-density");
  else document.documentElement.setAttribute("data-density", d);
}

export function setDensity(d: Density): void {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(KEY, d);
    applyDensityAttr(d);
    w.dispatchEvent(new CustomEvent("currents-density-changed"));
  } catch {
    /* 存储满/私密模式下静默失败 */
  }
}

export function subscribeDensityChanged(cb: () => void): () => void {
  const w = safeWindow();
  if (!w) return () => {};
  const handler = () => cb();
  w.addEventListener("currents-density-changed", handler);
  w.addEventListener("storage", handler);
  return () => {
    w.removeEventListener("currents-density-changed", handler);
    w.removeEventListener("storage", handler);
  };
}
