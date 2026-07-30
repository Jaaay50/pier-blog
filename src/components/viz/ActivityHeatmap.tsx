"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useInView } from "motion/react";

interface ActivityHeatmapProps {
  /** 已发布文章日期（ISO）作为高强度锚点 */
  postDates: string[];
  /** 展示周数（默认 26 = 半年） */
  weeks?: number;
  className?: string;
}

interface DayCell {
  date: Date;
  /** 0-4 强度等级 */
  level: number;
}

/** 确定性伪随机（同一天永远同强度，避免水合不一致） */
function seededLevel(date: Date): number {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  let h = seed;
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  const r = ((h ^= h >>> 16) >>> 0) / 4294967295;
  // 偏向低强度的分布：60% 空 / 40% 有活动
  if (r < 0.58) return 0;
  if (r < 0.78) return 1;
  if (r < 0.9) return 2;
  if (r < 0.97) return 3;
  return 4;
}

/**
 * Phase 6：GitHub 风格活动热力图（零依赖）。
 * - 文章发布日固定为最高强度，其余日期确定性伪随机填充
 * - 格子按周列 stagger 淡入；hover 显示日期 + 强度
 * - 颜色走 --accent 透明度阶梯，自动适配双主题
 */
export function ActivityHeatmap({
  postDates,
  weeks = 26,
  className = "",
}: ActivityHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: "-10%" });
  const [hovered, setHovered] = useState<DayCell | null>(null);

  const grid = useMemo(() => {
    const postSet = new Set(
      postDates.map((d) => new Date(d).toDateString())
    );
    const today = new Date();
    // 对齐到本周日结尾
    const end = new Date(today);
    const cols: DayCell[][] = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const col: DayCell[] = [];
      for (let d = 6; d >= 0; d--) {
        const date = new Date(end);
        date.setDate(end.getDate() - (w * 7 + d));
        const isPost = postSet.has(date.toDateString());
        col.push({ date, level: isPost ? 4 : seededLevel(date) });
      }
      cols.push(col);
    }
    return cols;
  }, [postDates, weeks]);

  const levelOpacity = [0.08, 0.25, 0.45, 0.7, 1];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex gap-[3px] overflow-x-auto pb-2">
        {grid.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((cell) => (
              <motion.span
                key={cell.date.toISOString()}
                className="h-3 w-3 shrink-0 cursor-default rounded-[2px]"
                style={{
                  backgroundColor: `color-mix(in srgb, var(--accent) ${
                    levelOpacity[cell.level] * 100
                  }%, var(--bg-card))`,
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: ci * 0.02, duration: 0.3 }}
                onMouseEnter={() => setHovered(cell)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      <div className="mt-2 h-5 text-xs text-[var(--text-muted)]">
        {hovered
          ? `${hovered.date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })} — ${
              hovered.level === 0
                ? "no activity"
                : hovered.level === 4
                  ? "peak activity"
                  : `level ${hovered.level}`
            }`
          : "\u00a0"}
      </div>
    </div>
  );
}
