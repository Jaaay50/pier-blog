import type { CoastalTime } from "@/components/guestbook/coastal-time";

export const COAST_LAST_CLIP_KEY = "guestbook-coast-last";

export const COAST_CLIPS: Record<CoastalTime, readonly string[]> = {
  dawn: ["/guestbook/coast-dawn.webm"],
  day: ["/guestbook/coast-day.webm"],
  dusk: ["/guestbook/coast-dusk.webm"],
  night: ["/guestbook/coast-night.webm"],
};

export const COAST_STILL: Record<CoastalTime, string> = {
  dawn: "/guestbook/coast-dawn.webp",
  day: "/guestbook/coast-day.webp",
  dusk: "/guestbook/coast-dusk.webp",
  night: "/guestbook/coast-night.webp",
};

export function lastClipStorageKey(period: CoastalTime): string {
  return `${COAST_LAST_CLIP_KEY}:${period}`;
}

/** 有多条时，下一次必从「上次以外」里抽；只有一条则原样返回。 */
export function pickNextCoastClip(
  clips: readonly string[],
  last: string | null,
  random: () => number = Math.random,
): string {
  if (clips.length === 0) return "";
  if (clips.length === 1) return clips[0] ?? "";
  const pool = last && clips.includes(last) ? clips.filter((clip) => clip !== last) : [...clips];
  const index = Math.max(0, Math.min(pool.length - 1, Math.floor(random() * pool.length)));
  return pool[index] ?? clips[0] ?? "";
}
