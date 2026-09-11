"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { coastalTimeForDate, type CoastalTime } from "./coastal-time";

const PERIODS: CoastalTime[] = ["dawn", "day", "dusk", "night"];

interface CoastalSceneProps {
  children: ReactNode;
  label: string;
  title: string;
  description: string;
  timeLabel: Record<CoastalTime, string>;
}

function videoSrc(period: CoastalTime, mobile: boolean): string {
  return mobile ? `/guestbook/coast-mobile-${period}.webm` : `/guestbook/coast-${period}.webm`;
}

export function CoastalScene({ children, label, title, description, timeLabel }: CoastalSceneProps) {
  const [time, setTime] = useState<CoastalTime>(() => coastalTimeForDate());
  const [canMotion, setCanMotion] = useState(false);
  const [mobile, setMobile] = useState(false);
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
    const width = window.matchMedia("(max-width: 640px)");
    const apply = () => {
      setCanMotion(!motion.matches);
      setMobile(width.matches);
    };
    apply();
    motion.addEventListener("change", apply);
    width.addEventListener("change", apply);
    return () => {
      motion.removeEventListener("change", apply);
      width.removeEventListener("change", apply);
    };
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
  }, [canMotion, mobile, time]);

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
            src={videoSrc(key, mobile)}
            muted
            loop
            playsInline
            preload={key === time ? "auto" : "none"}
            data-testid={key === time ? "guestbook-coastal-video" : undefined}
          />
        ))}
      </div>
      <div className="guestbook-coastal-ambient" aria-hidden="true"><span className="coastal-cloud" /><span className="coastal-sparkles" /><span className="coastal-grass" /></div>
      <div className="guestbook-coastal-content">
        <header className="guestbook-coastal-intro">
          <p className="guestbook-coastal-label">{timeLabel[time]}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </div>
    </section>
  );
}
