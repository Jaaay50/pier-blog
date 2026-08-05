/**
 * 已读状态：localStorage 记录已点开详情的 item id。
 * 结构 / 上限 / SSR 安全参照 favorites.ts。
 */
const KEY = "pier-currents-read-v1";
const MAX = 2000;

function safeWindow(): Window | null {
  return typeof window === "undefined" ? null : window;
}

export function getReadIds(): string[] {
  const w = safeWindow();
  if (!w) return [];
  try {
    const raw = w.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return []; // JSON 损坏安全回退
  }
}

export function markRead(id: string): void {
  const w = safeWindow();
  if (!w) return;
  const ids = getReadIds();
  if (ids.includes(id)) return;
  const next = [id, ...ids].slice(0, MAX);
  try {
    w.localStorage.setItem(KEY, JSON.stringify(next));
    w.dispatchEvent(new CustomEvent("currents-read-changed"));
  } catch {
    /* 存储满/私密模式下静默失败 */
  }
}

export function subscribeReadChanged(cb: () => void): () => void {
  const w = safeWindow();
  if (!w) return () => {};
  const handler = () => cb();
  w.addEventListener("currents-read-changed", handler);
  w.addEventListener("storage", handler);
  return () => {
    w.removeEventListener("currents-read-changed", handler);
    w.removeEventListener("storage", handler);
  };
}
