"use client";

import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useWebGLQuality } from "@/lib/webgl";

// 架构决策：ogl 不进主 chunk，WebGL 组件必须 next/dynamic 懒加载
const ShaderGradient = dynamic(() => import("@/components/webgl/ShaderGradient"), {
  ssr: false,
  loading: () => null,
});

interface FluidBackgroundProps {
  /** 整体强度 0-1，默认 0.5（作为区块背景足够微妙） */
  intensity?: number;
  speed?: number;
  className?: string;
}

/**
 * 主题感知的流体 Shader 背景（带完整性能降级）：
 * - 深色（Kimi）：蓝紫流体
 * - 浅色（Claude）：暖陶土流体
 * - WebGL 不可用 / 低端设备 / prefers-reduced-motion：静态 CSS 渐变
 */
export function FluidBackground({
  intensity = 0.5,
  speed = 1,
  className = "",
}: FluidBackgroundProps) {
  const { resolvedTheme } = useTheme();
  // quality 在挂载前为 null，兼作水合门，避免主题闪烁
  const quality = useWebGLQuality();

  if (!quality) {
    return <div className={className} aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";
  const colors: [string, string, string] = isDark
    ? ["#1a2b45", "#3d3566", "#6a9bcc"]
    : ["#f3d9c8", "#e8c4a0", "#d97757"];

  if (!quality.enabled) {
    return (
      <div
        className={className}
        aria-hidden
        style={{
          background: isDark
            ? "linear-gradient(135deg, rgba(26,43,69,0.5), rgba(61,53,102,0.35), rgba(106,155,204,0.25))"
            : "linear-gradient(135deg, rgba(243,217,200,0.6), rgba(232,196,160,0.45), rgba(217,119,87,0.3))",
        }}
      />
    );
  }

  return (
    <div className={className} aria-hidden>
      <ShaderGradient
        colors={colors}
        intensity={intensity}
        speed={speed}
        dpr={quality.dpr}
      />
    </div>
  );
}
