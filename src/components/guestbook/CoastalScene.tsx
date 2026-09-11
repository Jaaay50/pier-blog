"use client";

import { useEffect, useState, type ReactNode } from "react";
import { coastalTimeForDate, type CoastalTime } from "./coastal-time";

const PERIODS: CoastalTime[] = ["dawn", "day", "dusk", "night"];

interface CoastalSceneProps {
  children: ReactNode;
  label: string;
  title: string;
  description: string;
  timeLabel: Record<CoastalTime, string>;
}

export function CoastalScene({ children, label, title, description, timeLabel }: CoastalSceneProps) {
  const [time, setTime] = useState<CoastalTime>(() => coastalTimeForDate());
  useEffect(() => {
    const update = () => setTime((current) => {
      const next = coastalTimeForDate();
      return current === next ? current : next;
    });
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="guestbook-coastal-scene" data-testid="guestbook-coastal-scene" data-coastal-time={time} aria-label={label}>
      <div className="guestbook-coastal-background" aria-hidden="true">
        {PERIODS.map((key) => (
          <div
            key={key}
            className={`guestbook-coastal-layer guestbook-coastal-layer-${key}${key === time ? " is-active" : ""}`}
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
