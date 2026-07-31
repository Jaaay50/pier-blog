"use client";

import { motion } from "motion/react";

interface HandwrittenEnglishProps {
  color?: string;
  delay?: number;
  className?: string;
}

/**
 * 英文手写动效组件
 * 使用 SVG stroke-dashoffset 动画模拟手写 "Hello"
 * 字形基于草书风格，一笔流畅连写
 */
export function HandwrittenEnglish({
  color = "#1a1a1a",
  delay = 0,
  className = "",
}: HandwrittenEnglishProps) {
  // 手写草书 "Hello" 的 SVG 路径（简化版，模拟连笔效果）
  // 这是一个近似的手写路径，视觉效果类似真实手写
  const helloPath = `
    M 80 140 
    Q 80 70 90 60 
    T 100 80 
    L 100 140 
    M 100 90 
    L 115 90 
    M 140 80 
    Q 140 65 155 65 
    Q 170 65 170 80 
    L 170 125 
    Q 170 145 155 145 
    Q 145 145 145 135 
    M 195 65 
    L 195 145 
    M 195 145 
    Q 210 155 225 145 
    M 250 65 
    L 250 145 
    M 250 145 
    Q 265 155 280 145 
    M 305 80 
    Q 305 65 320 65 
    Q 335 65 335 80 
    L 335 125 
    Q 335 145 320 145 
    Q 305 145 305 125
  `.replace(/\s+/g, ' ').trim();

  return (
    <div className={className}>
      <svg
        viewBox="0 0 400 200"
        className="w-full h-auto"
        style={{ overflow: "visible" }}
      >
        <motion.path
          d={helloPath}
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{
            pathLength: 0,
            opacity: 0,
          }}
          animate={{
            pathLength: 1,
            opacity: 1,
          }}
          transition={{
            pathLength: {
              duration: 2.8,
              ease: [0.22, 0.61, 0.36, 1],
              delay: delay / 1000,
            },
            opacity: {
              duration: 0.01,
              delay: delay / 1000,
            },
          }}
        />
      </svg>
    </div>
  );
}
