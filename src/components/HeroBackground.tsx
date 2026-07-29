"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Galaxy from "@/components/reactbits/Galaxy";
import Aurora from "@/components/reactbits/Aurora";

/**
 * 双模式 Hero 背景：
 * - 深色（Kimi）：Galaxy 蓝紫星空 + 鼠标斥力，科技感
 * - 浅色（Claude）：Aurora 暖陶土极光，慢速流动，人文感
 */
export function HeroBackground() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // SSR/水合阶段渲染空占位，避免主题闪烁
  if (!mounted) {
    return <div className="fixed inset-0 -z-10" aria-hidden />;
  }

  if (resolvedTheme === "dark") {
    return (
      <div className="fixed inset-0 -z-10 opacity-40" aria-hidden>
        <Galaxy
          mouseInteraction
          mouseRepulsion
          repulsionStrength={0.15}
          density={6000}
          glowIntensity={0.8}
          twinkleIntensity={0.6}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 -z-10 opacity-30" aria-hidden>
      <Aurora
        colorStops={["#d97757", "#e8c4a0", "#d4a27f"]}
        amplitude={0.8}
        blend={0.6}
      />
    </div>
  );
}
