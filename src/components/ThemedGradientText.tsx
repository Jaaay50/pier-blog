import { ReactNode } from "react";
import GradientText from "@/components/reactbits/GradientText";

/**
 * 主题感知的渐变文字：
 * - 深色（Kimi）：蓝→紫流光
 * - 浅色（Claude）：陶土→琥珀暖调
 *
 * 颜色走 CSS 变量（globals.css 中按主题定义），
 * 无需 useTheme / 水合门，SSR 首帧即正确、切换主题即时生效。
 */
export function ThemedGradientText({ children }: { children: ReactNode }) {
  return (
    <GradientText
      colors={[
        "var(--gradient-text-1)",
        "var(--gradient-text-2)",
        "var(--gradient-text-3)",
        "var(--gradient-text-1)",
      ]}
    >
      {children}
    </GradientText>
  );
}
