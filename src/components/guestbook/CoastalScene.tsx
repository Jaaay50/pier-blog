"use client";

import { useEffect, useRef, useState } from "react";
import {
  COAST_CLIPS,
  COAST_STILL,
  lastClipStorageKey,
  pickNextCoastClip,
} from "@/lib/guestbook-coast-clips";
import { coastalTimeForDate, type CoastalTime } from "./coastal-time";

const PERIODS: CoastalTime[] = ["dawn", "day", "dusk", "night"];

interface CoastalSceneProps {
  label: string;
  onPick?: () => void;
}

function readLastClip(period: CoastalTime): string | null {
  try {
    return window.localStorage.getItem(lastClipStorageKey(period));
  } catch {
    return null;
  }
}

function writeLastClip(period: CoastalTime, clip: string): void {
  try {
    window.localStorage.setItem(lastClipStorageKey(period), clip);
  } catch {
    /* private mode */
  }
}

export function CoastalScene({ label, onPick }: CoastalSceneProps) {
  const [time, setTime] = useState<CoastalTime>(() => coastalTimeForDate());
  const [canMotion, setCanMotion] = useState(false);
  const [clip, setClip] = useState<string | null>(null);
  const [clipPeriod, setClipPeriod] = useState<CoastalTime | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (typeof window !== "undefined" && clipPeriod !== time) {
    const next = pickNextCoastClip(COAST_CLIPS[time], readLastClip(time));
    writeLastClip(time, next);
    setClipPeriod(time);
    setClip(next);
  }

  useEffect(() => {
    const update = () => setTime((current) => {
      const next = coastalTimeForDate();
      return current === next ? current : next;
    });
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setCanMotion(!motion.matches);
    apply();
    motion.addEventListener("change", apply);
    return () => motion.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!canMotion || !clip) return;
    const node = videoRef.current;
    if (!node) return;
    const play = node.play();
    if (play) void play.catch(() => {});
  }, [canMotion, clip]);

  return (
    <section
      className={`guestbook-coastal-scene${onPick ? " is-pickable" : ""}`}
      data-testid="guestbook-coastal-scene"
      data-coastal-time={time}
      data-coastal-clip={clip ?? undefined}
      aria-label={label}
      onClick={onPick}
    >
      <div className="guestbook-coastal-background" aria-hidden="true">
        {PERIODS.map((key) => (
          <div
            key={key}
            className={`guestbook-coastal-layer guestbook-coastal-layer-${key}${key === time ? " is-active" : ""}`}
          />
        ))}
        {canMotion && clip && (
          <video
            key={clip}
            ref={videoRef}
            className="guestbook-coastal-video is-active"
            src={clip}
            poster={COAST_STILL[time]}
            muted
            loop
            playsInline
            preload="auto"
            data-testid="guestbook-coastal-video"
          />
        )}
      </div>
    </section>
  );
}
