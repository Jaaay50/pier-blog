"use client";

import { motion, useScroll, useTransform, MotionValue } from "motion/react";
import { useWebGLQuality } from "@/lib/webgl";

interface Shape {
  /** 位置（百分比） */
  x: string;
  y: string;
  size: number;
  /** 前景速度倍率（相对滚动） */
  speed: number;
  variant: "ring" | "dot" | "cross" | "triangle";
  delay: number;
}

const SHAPES: Shape[] = [
  { x: "12%", y: "22%", size: 22, speed: -220, variant: "ring", delay: 0 },
  { x: "85%", y: "18%", size: 14, speed: -300, variant: "dot", delay: 0.4 },
  { x: "76%", y: "62%", size: 20, speed: -260, variant: "cross", delay: 0.8 },
  { x: "8%", y: "68%", size: 18, speed: -340, variant: "triangle", delay: 1.2 },
  { x: "58%", y: "12%", size: 10, speed: -280, variant: "dot", delay: 1.6 },
  { x: "30%", y: "78%", size: 16, speed: -240, variant: "ring", delay: 2.0 },
];

/**
 * Phase 5：Hero 前景浮动几何层（三层视差的最快层）。
 * - 所有形状共享同一个 useScroll() 实例，避免 6 条独立 scroll 订阅
 * - 低端设备 / reduced-motion 不渲染（quality gate）
 */
export function FloatingShapes() {
  const quality = useWebGLQuality();
  // 单一 scrollY，传给所有子形状，避免重复订阅
  const { scrollY } = useScroll();

  if (!quality || !quality.enabled || !quality.mouseInteraction) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden>
      {SHAPES.map((shape, i) => (
        <FloatingShape key={i} shape={shape} scrollY={scrollY} />
      ))}
    </div>
  );
}

function FloatingShape({
  shape,
  scrollY,
}: {
  shape: Shape;
  scrollY: MotionValue<number>;
}) {
  const shapeY = useTransform(scrollY, [0, 600], [0, shape.speed]);

  return (
    <motion.div
      className="absolute"
      style={{ left: shape.x, top: shape.y, y: shapeY }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 0.5, scale: 1 }}
      transition={{ delay: 2.2 + shape.delay * 0.3, duration: 0.8 }}
    >
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [0, 8, 0] }}
        transition={{
          duration: 5 + shape.delay,
          repeat: Infinity,
          ease: "easeInOut",
          delay: shape.delay,
        }}
      >
        <ShapeSVG variant={shape.variant} size={shape.size} />
      </motion.div>
    </motion.div>
  );
}

function ShapeSVG({
  variant,
  size,
}: {
  variant: Shape["variant"];
  size: number;
}) {
  const stroke = "var(--text-muted)";
  switch (variant) {
    case "ring":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "dot":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5" fill={stroke} opacity="0.7" />
        </svg>
      );
    case "cross":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 4v16M4 12h16"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "triangle":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 4 L21 19 H3 Z"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}
