"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, ReactNode } from "react";
import GradientText from "@/components/reactbits/GradientText";

/**
 * 主题感知的渐变文字：
 * - 深色（Kimi）：蓝→紫流光
 * - 浅色（Claude）：陶土→琥珀暖调
 */
export function ThemedGradientText({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const colors =
    mounted && resolvedTheme === "dark"
      ? ["#6a9bcc", "#8b7fcc", "#a78bfa", "#6a9bcc"]
      : ["#d97757", "#c6613f", "#d4a27f", "#d97757"];

  return <GradientText colors={colors}>{children}</GradientText>;
}
