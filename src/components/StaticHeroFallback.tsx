"use client";

/**
 * WebGL 不可用 / 低端设备 / prefers-reduced-motion 时的静态降级背景。
 * 纯 CSS 渐变，零 JS 动画开销：
 * - 深色（Kimi）：深空径向渐变 + 稀疏静态星点
 * - 浅色（Claude）：暖陶土柔和渐变
 */
export function StaticHeroFallback({ isDark }: { isDark: boolean }) {
  if (isDark) {
    return (
      <div className="absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 35%, rgba(106, 155, 204, 0.14) 0%, rgba(139, 127, 204, 0.07) 45%, transparent 75%), #0f0f0f",
          }}
        />
        {/* 静态星点（box-shadow 单元素多星） */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(1px 1px at 12% 25%, #f5f5f5 50%, transparent 100%)," +
              "radial-gradient(1px 1px at 28% 62%, #a1b8d4 50%, transparent 100%)," +
              "radial-gradient(1.5px 1.5px at 45% 18%, #f5f5f5 50%, transparent 100%)," +
              "radial-gradient(1px 1px at 58% 48%, #8b7fcc 50%, transparent 100%)," +
              "radial-gradient(1px 1px at 71% 30%, #f5f5f5 50%, transparent 100%)," +
              "radial-gradient(1.5px 1.5px at 84% 60%, #a1b8d4 50%, transparent 100%)," +
              "radial-gradient(1px 1px at 20% 82%, #f5f5f5 50%, transparent 100%)," +
              "radial-gradient(1px 1px at 65% 78%, #6a9bcc 50%, transparent 100%)," +
              "radial-gradient(1.5px 1.5px at 90% 15%, #f5f5f5 50%, transparent 100%)," +
              "radial-gradient(1px 1px at 38% 40%, #f5f5f5 50%, transparent 100%)",
          }}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 20%, rgba(217, 119, 87, 0.16) 0%, rgba(232, 196, 160, 0.12) 40%, transparent 75%), " +
            "radial-gradient(ellipse 60% 50% at 80% 70%, rgba(212, 162, 127, 0.1) 0%, transparent 70%), #faf9f5",
        }}
      />
    </div>
  );
}
