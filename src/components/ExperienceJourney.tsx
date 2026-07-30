"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValueEvent,
} from "motion/react";

interface Experience {
  title: string;
  company: string;
  period: string;
  description: string;
}

interface ExperienceJourneyProps {
  title: string;
  experiences: Experience[];
}

/** 桌面 + 精确指针 + 非 reduced-motion 才启用横向叙事（SSR 返回 false） */
function useHorizontalCapable() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(
        "(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
      );
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () =>
      window.matchMedia(
        "(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
      ).matches,
    () => false
  );
}

/**
 * Phase 5：经历横向滚动叙事时间线。
 * - 桌面端：区块钉住（sticky），竖向滚动驱动卡片横向滑动
 * - SVG 波浪路径随滚动进度绘制（pathLength）
 * - 顶部进度指示点跟随当前卡片
 * - 移动端 / 触控 / reduced-motion：降级为传统竖向时间线
 */
export function ExperienceJourney({ title, experiences }: ExperienceJourneyProps) {
  const horizontal = useHorizontalCapable();

  if (!horizontal) {
    return <VerticalTimeline title={title} experiences={experiences} />;
  }
  return <HorizontalJourney title={title} experiences={experiences} />;
}

/* ============ 桌面端：钉住 + 横向滑动 ============ */

function HorizontalJourney({ title, experiences }: ExperienceJourneyProps) {
  const wrapperRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(0);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });
  // 弹簧平滑：横移带轻微惯性
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  const x = useTransform(progress, [0, 1], [0, -overflow]);
  const pathLength = useTransform(scrollYProgress, [0.02, 0.95], [0, 1]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(
      experiences.length - 1,
      Math.round(v * (experiences.length - 1))
    );
    setActive(idx);
  });

  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const track = trackRef.current;
      if (!container || !track) return;
      setOverflow(Math.max(0, track.scrollWidth - container.clientWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [experiences.length]);

  return (
    <section
      ref={wrapperRef}
      className="relative"
      style={{ height: `${100 + experiences.length * 90}vh` }}
    >
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto mb-10 w-full max-w-4xl px-6">
          <h2 className="mb-6 text-2xl font-bold tracking-tight">{title}</h2>
          {/* 进度指示点 */}
          <div className="flex items-center gap-2" role="presentation">
            {experiences.map((exp, i) => (
              <span
                key={exp.title}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active
                    ? "w-8 bg-[var(--accent)]"
                    : "w-3 bg-[var(--border-hover)]"
                }`}
              />
            ))}
          </div>
        </div>

        <div ref={containerRef} className="relative w-full">
          {/* SVG 波浪路径：随滚动进度绘制 */}
          <svg
            className="pointer-events-none absolute left-0 top-1/2 h-28 w-full -translate-y-1/2"
            viewBox="0 0 1200 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M0,50 C200,12 320,88 520,50 C720,12 840,88 1040,50 C1120,34 1160,58 1200,50"
              fill="none"
              stroke="var(--border-hover)"
              strokeWidth="1.5"
              opacity={0.4}
            />
            <motion.path
              d="M0,50 C200,12 320,88 520,50 C720,12 840,88 1040,50 C1120,34 1160,58 1200,50"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ pathLength }}
              opacity={0.6}
            />
          </svg>

          {/* 横移轨道：每卡 70vw，滚动驱动 */}
          <motion.div
            ref={trackRef}
            style={{ x }}
            className="flex items-center gap-[6vw] pl-[15vw] pr-[15vw]"
          >
            {experiences.map((exp, i) => (
              <JourneyCard key={exp.title} exp={exp} active={i === active} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function JourneyCard({ exp, active }: { exp: Experience; active: boolean }) {
  return (
    <motion.article
      animate={{
        scale: active ? 1 : 0.94,
        opacity: active ? 1 : 0.55,
      }}
      transition={{ type: "spring", stiffness: 200, damping: 26 }}
      className="relative w-[70vw] max-w-3xl shrink-0"
    >
      {/* 背景大字年份装饰 */}
      <div
        className="font-display pointer-events-none absolute -top-14 left-2 select-none text-7xl font-semibold tracking-tight text-[var(--accent)] opacity-[0.08]"
        aria-hidden
      >
        {exp.period}
      </div>

      <div className="card-interactive relative rounded-2xl p-10 backdrop-blur-sm">
        <div className="mb-2 text-sm text-[var(--text-muted)]">{exp.period}</div>
        <h3 className="mb-1 text-2xl font-semibold tracking-tight">
          {exp.title}
        </h3>
        <div className="mb-4 text-sm font-medium text-[var(--accent)]">
          {exp.company}
        </div>
        <p className="max-w-xl leading-relaxed text-[var(--text-secondary)]">
          {exp.description}
        </p>
      </div>
    </motion.article>
  );
}

/* ============ 移动端 / 降级：竖向时间线（SVG 竖线随进入绘制） ============ */

function VerticalTimeline({ title, experiences }: ExperienceJourneyProps) {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-2xl font-bold tracking-tight">{title}</h2>
        <div className="space-y-8">
          {experiences.map((exp, i) => (
            <motion.div
              key={exp.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group border-l-2 border-[var(--border)] pl-6 transition-colors hover:border-[var(--accent)]"
            >
              <div className="mb-1 text-sm text-[var(--text-muted)]">
                {exp.period}
              </div>
              <h3 className="mb-1 text-lg font-semibold">{exp.title}</h3>
              <div className="mb-2 text-sm text-[var(--accent)]">
                {exp.company}
              </div>
              <p className="leading-relaxed text-[var(--text-secondary)]">
                {exp.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
