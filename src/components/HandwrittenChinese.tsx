"use client";

import { useEffect, useRef } from "react";
import HanziWriter from "hanzi-writer";

interface HandwrittenChineseProps {
  text: string;
  size?: number;
  color?: string;
  delay?: number;
}

/**
 * 中文手写动效组件
 * 使用 HanziWriter 逐笔书写汉字，笔顺正确，类似苹果发布会效果
 */
export function HandwrittenChinese({
  text,
  size = 180,
  color = "#1a1a1a",
  delay = 0,
}: HandwrittenChineseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writersRef = useRef<HanziWriter[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const chars = text.split("");
    
    // 清空容器
    container.innerHTML = "";
    writersRef.current = [];

    // 为每个字创建独立的 SVG 容器
    chars.forEach((char, index) => {
      const charContainer = document.createElement("div");
      charContainer.className = "inline-block";
      charContainer.style.width = `${size}px`;
      charContainer.style.height = `${size}px`;
      container.appendChild(charContainer);

      const writer = HanziWriter.create(charContainer, char, {
        width: size,
        height: size,
        padding: 0,
        showOutline: false,
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 60,
        strokeColor: color,
        radicalColor: color,
        drawingWidth: Math.max(size * 0.12, 20),
      });

      writersRef.current.push(writer);
    });

    // 延迟后开始动画
    const timer = setTimeout(() => {
      writersRef.current.forEach((writer, index) => {
        setTimeout(() => {
          writer.animateCharacter();
        }, index * 600); // 每个字间隔 600ms
      });
    }, delay);

    return () => {
      clearTimeout(timer);
      writersRef.current.forEach((writer) => writer.cancelQuiz?.());
    };
  }, [text, size, color, delay]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: `${size * 0.05}px`,
      }}
    />
  );
}
