"use client";

import { useEffect, useRef, useState } from "react";
import HanziWriter from "hanzi-writer";

interface HandwrittenChineseProps {
  text: string;
  size?: number;
  delay?: number;
}

/**
 * 中文手写动效组件 — 苹果风格
 * - 彩色笔画（渐变色）
 * - 按顺序逐字书写（第一个字完成后才开始第二个字）
 * - 速度放慢，更有真人书写质感
 */
export function HandwrittenChinese({
  text,
  size = 180,
  delay = 0,
}: HandwrittenChineseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writersRef = useRef<HanziWriter[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !mounted) return;

    const container = containerRef.current;
    const chars = text.split("");
    
    container.innerHTML = "";
    writersRef.current = [];

    // 苹果风格彩色渐变（从橙到粉到紫）
    const colors = ["#FF6B35", "#FF8E53", "#FFB088", "#E8A0BF", "#B57EDC"];

    // 为每个字创建 writer
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
        strokeAnimationSpeed: 0.8, // 更慢，更有质感
        delayBetweenStrokes: 120,   // 笔画间隔更长
        strokeColor: colors[index % colors.length],
        radicalColor: colors[index % colors.length],
        drawingWidth: Math.max(size * 0.15, 24), // 笔画更粗，更像真人书写
      });

      writersRef.current.push(writer);
    });

    // 按顺序逐字书写
    const startSequentialAnimation = () => {
      const animateChar = (charIndex: number) => {
        if (charIndex >= writersRef.current.length) return;
        
        writersRef.current[charIndex].animateCharacter({
          onComplete: () => {
            // 当前字写完，等待 400ms 后开始下一个字
            setTimeout(() => {
              animateChar(charIndex + 1);
            }, 400);
          },
        });
      };

      animateChar(0);
    };

    const timer = setTimeout(startSequentialAnimation, delay);

    return () => {
      clearTimeout(timer);
      writersRef.current.forEach((writer) => writer.cancelQuiz?.());
    };
  }, [text, size, delay, mounted]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: `${size * 0.08}px`,
      }}
    />
  );
}
