"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  applyDensityAttr,
  DEFAULT_DENSITY,
  getDensity,
  subscribeDensityChanged,
  type Density,
} from "./density";

/** 响应式密度偏好（SSR 返回标准档，水合后同步真实值并刷到 <html data-density>） */
export function useDensity(): Density {
  const density = useSyncExternalStore(
    subscribeDensityChanged,
    getDensity,
    () => DEFAULT_DENSITY,
  );

  useEffect(() => {
    applyDensityAttr(density);
  }, [density]);

  return density;
}
