"use client";

import { useTheme } from "next-themes";
import Galaxy from "@/components/reactbits/Galaxy";
import Aurora from "@/components/reactbits/Aurora";
import { StaticHeroFallback } from "@/components/StaticHeroFallback";
import { useWebGLQuality } from "@/lib/webgl";

/**
 * 双模式 Hero 背景：
 * - 深色（Kimi）：Galaxy 蓝紫星空 + 鼠标斥力，科技感
 * - 浅色（Claude）：Aurora 暖陶土极光，慢速流动，人文感
 * - 性能降级：WebGL 不可用 / 低端设备 / prefers-reduced-motion 时静态背景
 */
export function HeroBackground() {
  const { resolvedTheme } = useTheme();
  const quality = useWebGLQuality();

  // SSR/水合阶段（quality 尚未计算）渲染空占位，避免主题闪烁
  if (!quality) {
    return <div className="fixed inset-0 -z-10" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  if (!quality.enabled) {
    return (
      <div className="fixed inset-0 -z-10" aria-hidden>
        <StaticHeroFallback isDark={isDark} />
      </div>
    );
  }

  if (isDark) {
    return (
      <div className="fixed inset-0 -z-10 opacity-40" aria-hidden>
        <Galaxy
          mouseInteraction={quality.mouseInteraction}
          mouseRepulsion={quality.mouseInteraction}
          repulsionStrength={0.15}
          density={6000 * quality.particleMultiplier}
          glowIntensity={0.8}
          twinkleIntensity={0.6}
          dpr={quality.dpr}
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
