"use client";

import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useWebGLQuality } from "@/lib/webgl";

interface CardStack3DProps {
  cards: ReactNode[];
  className?: string;
  /** 卡片宽高（Tailwind 类交给外层，内部只管 3D 布局） */
  cardClassName?: string;
}

/**
 * Phase 3：3D 卡片堆叠。
 * - 透视堆叠：后面的卡片依次缩小、下移、变暗
 * - 点击 / 拖拽顶层卡片 → 飞出并循环到底部
 * - prefers-reduced-motion 时禁用飞出动画，改为简单切换
 */
export function CardStack3D({ cards, className = "", cardClassName = "" }: CardStack3DProps) {
  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const quality = useWebGLQuality();
  const reduced = quality?.reducedMotion ?? false;

  const cycle = () => {
    setOrder(prev => [...prev.slice(1), prev[0]]);
  };

  return (
    <div
      className={`relative ${className}`}
      style={{ perspective: "1000px" }}
    >
      <AnimatePresence initial={false}>
        {order.map((cardIndex, position) => {
          const isTop = position === 0;
          return (
            <motion.div
              key={cardIndex}
              className={`absolute inset-0 ${cardClassName}`}
              style={{
                transformStyle: "preserve-3d",
                cursor: isTop ? "grab" : "auto",
                zIndex: cards.length - position,
              }}
              animate={{
                y: position * 14,
                scale: 1 - position * 0.05,
                rotateX: reduced ? 0 : position * -2,
                filter: `brightness(${1 - position * 0.12})`,
                opacity: position > 3 ? 0 : 1,
              }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 260, damping: 26 }
              }
              drag={isTop && !reduced ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 90) cycle();
              }}
              onClick={() => isTop && cycle()}
              whileTap={isTop && !reduced ? { cursor: "grabbing", scale: 1.02 } : undefined}
              exit={
                reduced
                  ? { opacity: 0, transition: { duration: 0 } }
                  : { x: 240, opacity: 0, rotate: 8, transition: { duration: 0.3 } }
              }
            >
              {cards[cardIndex]}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
