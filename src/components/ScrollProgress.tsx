"use client";

import { motion, useScroll, useSpring, useReducedMotion } from "motion/react";

/**
 * ScrollProgress：文章页顶部 2px 进度线。
 * - scaleX 由全页滚动进度驱动（motion useScroll）
 * - 线尾 8px 微光渐变（reduced-motion 下去掉，保留进度条本体——它是信息不是装饰）
 * - z-index 低于 Navbar(50)；view-transition-name 隔离，不与路由快照冲突
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 28,
    restDelta: 0.001,
  });
  const reduced = useReducedMotion();

  return (
    <motion.div
      aria-hidden
      className="scroll-progress"
      style={{ scaleX }}
    >
      {!reduced && <span className="scroll-progress-glow" />}
    </motion.div>
  );
}
