"use client";

import { useSyncExternalStore } from "react";
import { getReadIds, subscribeReadChanged } from "./readState";

// 模块级缓存：useSyncExternalStore 需要稳定引用
let cachedRaw: string | null = null;
let cachedList: string[] = [];

function computeRead(): string[] {
  if (typeof window === "undefined") return cachedList;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem("pier-currents-read-v1");
  } catch {
    return cachedList;
  }
  if (raw === cachedRaw) return cachedList;
  cachedRaw = raw;
  cachedList = getReadIds();
  return cachedList;
}

/** 响应式已读列表（SSR 返回空数组，水合后同步真实值） */
export function useReadIds(): string[] {
  return useSyncExternalStore(subscribeReadChanged, computeRead, () => cachedList);
}

export function useIsRead(itemId: string): boolean {
  return useReadIds().includes(itemId);
}
