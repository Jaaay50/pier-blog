"use client";

import { useSyncExternalStore } from "react";
import {
  readFavorites,
  subscribeFavorites,
  FAVORITES_KEY,
} from "./favorites";

// 模块级缓存：同一 localStorage 内容返回同一数组引用，保证 useSyncExternalStore 稳定
let cachedRaw: string | null = null;
let cachedList: string[] = [];

function computeFavorites(): string[] {
  if (typeof window === "undefined") return cachedList;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(FAVORITES_KEY);
  } catch {
    return cachedList;
  }
  if (raw === cachedRaw) return cachedList;
  cachedRaw = raw;
  cachedList = readFavorites();
  return cachedList;
}

function subscribe(callback: () => void): () => void {
  return subscribeFavorites(callback);
}

/** 响应式收藏列表（SSR 返回空数组，水合后同步真实值） */
export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, computeFavorites, () => cachedList);
}

export function useIsFavorite(itemId: string): boolean {
  return useFavorites().includes(itemId);
}
