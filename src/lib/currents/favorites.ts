/**
 * Currents 收藏 — localStorage 实现。
 * 契约（方案 13.10）：
 * - key: pier-currents-favorites-v1，value: string[] item IDs
 * - 处理 JSON 损坏、上限 500、SSR 不访问 window
 */

export const FAVORITES_KEY = "pier-currents-favorites-v1";
export const FAVORITES_LIMIT = 500;

/** 自定义事件：同一 tab 内收藏变更时通知所有订阅者（跨 tab 用 storage 事件） */
export const FAVORITES_CHANGED_EVENT = "pier-currents-favorites-changed";

function isStorageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readFavorites(): string[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 只保留字符串，去重
    return [...new Set(parsed.filter((v): v is string => typeof v === "string"))];
  } catch {
    // JSON 损坏：清空后返回空
    try {
      window.localStorage.removeItem(FAVORITES_KEY);
    } catch {
      /* ignore */
    }
    return [];
  }
}

function writeFavorites(ids: string[]): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    /* 配额满等异常静默 */
  }
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
}

/** 切换收藏；返回切换后的状态。超过上限时不新增并返回当前状态。 */
export function toggleFavorite(id: string): boolean {
  const ids = readFavorites();
  const idx = ids.indexOf(id);
  if (idx >= 0) {
    ids.splice(idx, 1);
    writeFavorites(ids);
    return false;
  }
  if (ids.length >= FAVORITES_LIMIT) {
    return false;
  }
  ids.push(id);
  writeFavorites(ids);
  return true;
}

export function subscribeFavorites(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onCustom = () => callback();
  const onStorage = (e: StorageEvent) => {
    if (e.key === FAVORITES_KEY || e.key === null) callback();
  };
  window.addEventListener(FAVORITES_CHANGED_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(FAVORITES_CHANGED_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
