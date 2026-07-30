"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore, ReactNode } from "react";
import GradientText from "@/components/reactbits/GradientText";

const emptySubscribe = () => () => {};

/**
 * 主题感知的渐变文字：
 * - 深色（Kimi）：蓝→紫流光
 * - 浅色（Claude）：陶土→琥珀暖调
 */
export function ThemedGradientText({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  // 水合门：SSR 返回 false，客户端挂载后返回 true，无 setState-in-effect
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const colors =
    mounted && resolvedTheme === "dark"
      ? ["#6a9bcc", "#8b7fcc", "#a78bfa", "#6a9bcc"]
      : ["#d97757", "#c6613f", "#d4a27f", "#d97757"];

  return <GradientText colors={colors}>{children}</GradientText>;
}
