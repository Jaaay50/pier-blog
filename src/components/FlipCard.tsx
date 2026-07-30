"use client";

import { ReactNode, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";

interface FlipCardProps {
  front: ReactNode;
  back: ReactNode;
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
 * Phase 5：3D 翻转卡片。
 * - 点击翻转（rotateY 180°，preserve-3d）
 * - 键盘可达（Enter/Space），aria-pressed 语义
 * - reduced-motion：无 3D 旋转，直接淡切
 */
export function FlipCard({ front, back, className = "" }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const reduced = useReducedMotion();

  const toggle = () => setFlipped((f) => !f);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={flipped}
      data-no-ripple
      className={`relative block w-full cursor-pointer text-left [perspective:1200px] ${className}`}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 220, damping: 24 }
        }
      >
        {/* 正面 */}
        <div className="h-full w-full [backface-visibility:hidden]">
          {front}
        </div>
        {/* 背面（预旋转 180°） */}
        <div className="absolute inset-0 h-full w-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {back}
        </div>
      </motion.div>
    </button>
  );
}
