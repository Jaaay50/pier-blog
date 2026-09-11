"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { coastalTimeForDate, type CoastalTime } from "./coastal-time";

const PERIODS: CoastalTime[] = ["dawn", "day", "dusk", "night"];

interface CoastalSceneProps {
  label: string;
  children?: ReactNode;
}

function videoSrc(period: CoastalTime): string {
  return `/guestbook/coast-${period}.webm`;
}

export function CoastalScene({ label, children }: CoastalSceneProps) {
  const [time, setTime] = useState<CoastalTime>(() => coastalTimeForDate());
  const [canMotion, setCanMotion] = useState(false);
  const videoRefs = useRef<Partial<Record<CoastalTime, HTMLVideoElement | null>>>({});

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
    if (!canMotion) return;
    for (const key of PERIODS) {
      const node = videoRefs.current[key];
      if (!node) continue;
      if (key === time) {
        const play = node.play();
        if (play) void play.catch(() => {});
      } else {
        node.pause();
      }
    }
  }, [canMotion, time]);

  return (
    <section className="guestbook-coastal-scene" data-testid="guestbook-coastal-scene" data-coastal-time={time} aria-label={label}>
      <div className="guestbook-coastal-background" aria-hidden="true">
        {PERIODS.map((key) => (
          <div
            key={key}
            className={`guestbook-coastal-layer guestbook-coastal-layer-${key}${key === time ? " is-active" : ""}`}
          />
        ))}
        {canMotion && PERIODS.map((key) => (
          <video
            key={`video-${key}`}
            ref={(node) => {
              videoRefs.current[key] = node;
            }}
            className={`guestbook-coastal-video${key === time ? " is-active" : ""}`}
            src={videoSrc(key)}
            muted
            loop
            playsInline
            preload={key === time ? "auto" : "none"}
            data-testid={key === time ? "guestbook-coastal-video" : undefined}
          />
        ))}
      </div>
      {children}
    </section>
  );
}
