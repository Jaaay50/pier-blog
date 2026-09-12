import type { CoastalTime } from "@/components/guestbook/coastal-time";

export const COAST_LAST_CLIP_KEY = "guestbook-coast-last";

export const COAST_CLIPS: Record<CoastalTime, readonly string[]> = {
  dawn: [
    "/guestbook/coast-dawn.webm",
    "/guestbook/coast-dawn-1.webm",
    "/guestbook/coast-dawn-2.webm",
    "/guestbook/coast-dawn-3.webm",
  ],
  day: [
    "/guestbook/coast-day.webm",
    "/guestbook/coast-day-1.webm",
    "/guestbook/coast-day-2.webm",
    "/guestbook/coast-day-3.webm",
  ],
  dusk: [
    "/guestbook/coast-dusk.webm",
    "/guestbook/coast-dusk-1.webm",
    "/guestbook/coast-dusk-2.webm",
    "/guestbook/coast-dusk-3.webm",
  ],
  night: [
    "/guestbook/coast-night-0.webm",
    "/guestbook/coast-night-1.webm",
    "/guestbook/coast-night-2.webm",
    "/guestbook/coast-night-3.webm",
  ],
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
