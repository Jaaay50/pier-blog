"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { motion, useInView } from "motion/react";

export interface RadarAxis {
  label: string;
  /** 0-100 */
  value: number;
}

interface SkillRadarProps {
  axes: RadarAxis[];
  /** SVG 视图尺寸 */
  size?: number;
  className?: string;
}

function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

/**
 * Phase 6：技能雷达图（零依赖，SVG + motion 自绘）。
 * - 多边形数据区从中心弹性展开（scale spring）
 * - 网格环 + 轴线 + 顶点 hover tooltip
 * - 双主题：颜色全部走 CSS 变量
 * - reduced-motion：无动画直接显示
 */
export function SkillRadar({ axes, size = 320, className = "" }: SkillRadarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: "-15%" });
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const n = axes.length;

  /** 第 i 轴、比例 t（0-1）处的坐标；从正上方起顺时针 */
  const point = (i: number, t: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * radius * t,
      y: cy + Math.sin(angle) * radius * t,
    };
  };

  const dataPoints = axes.map((a, i) => point(i, a.value / 100));
  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Skill radar: ${axes
          .map((a) => `${a.label} ${a.value}`)
          .join(", ")}`}
      >
        {/* 网格环 */}
        {rings.map((t) => (
          <polygon
            key={t}
            points={axes.map((_, i) => {
              const p = point(i, t);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none"
            stroke="var(--border)"
            strokeWidth={t === 1 ? 1.5 : 1}
            opacity={t === 1 ? 0.9 : 0.5}
          />
        ))}

        {/* 轴线 */}
        {axes.map((_, i) => {
          const p = point(i, 1);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="var(--border)"
              strokeWidth={1}
              opacity={0.5}
            />
          );
        })}

        {/* 数据多边形：从中心弹性展开 */}
        <motion.g
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          initial={reduced ? false : { scale: 0, opacity: 0 }}
          animate={
            inView ? { scale: 1, opacity: 1 } : reduced ? {} : { scale: 0, opacity: 0 }
          }
          transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.2 }}
        >
          <polygon
            points={polygonPoints}
            fill="var(--accent)"
            fillOpacity={0.16}
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </motion.g>

        {/* 顶点 */}
        {dataPoints.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hovered === i ? 6 : 4}
            fill="var(--bg-primary)"
            stroke="var(--accent)"
            strokeWidth={2}
            style={{ cursor: "pointer" }}
            initial={reduced ? false : { opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: reduced ? 0 : 0.5 + i * 0.06 }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}

        {/* 轴标签 */}
        {axes.map((a, i) => {
          const p = point(i, 1.22);
          return (
            <text
              key={a.label}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-[var(--text-secondary)] text-[11px] font-medium"
            >
              {a.label}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-medium shadow-lg"
          style={{
            left: `${(dataPoints[hovered].x / size) * 100}%`,
            top: `${(dataPoints[hovered].y / size) * 100}%`,
            marginTop: "-8px",
          }}
        >
          {axes[hovered].label}: {axes[hovered].value}
        </div>
      )}
    </div>
  );
}
