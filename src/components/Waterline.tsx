/**
 * Waterline：区块分隔发丝线。
 * 构型：一根 via-[var(--border)] 渐变线 + 线中央一颗 2px accent 点（粒子停在水面）。
 * 纯静态无动画；reduced-motion 无差异。
 */
export function Waterline({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`relative mx-auto w-full max-w-6xl ${className ?? ""}`}
    >
      <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      {/* 水面灯点：几何中心 */}
      <span
        className="absolute left-1/2 top-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)]"
      />
    </div>
  );
}
