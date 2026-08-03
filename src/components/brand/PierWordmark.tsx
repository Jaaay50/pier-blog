import { cn } from "@/lib/utils";

/**
 * Pier 字标：衬线 "Pier" + i 的 tittle 脱离本位（升高、放大、accent 灯点）。
 * 品牌叙事：Π 桥墩下的灯点，与 Hero 粒子、卡片点阵、Galaxy 星空同源。
 * hover：tittle 散成 4 颗微粒向上散开再聚回（纯 CSS transform/opacity，≤600ms）。
 * prefers-reduced-motion：完全静止。
 * 无 JS：文字由 --font-display 渲染，SSR 直接可见。
 */
export function PierWordmark({
  className,
  withWaterline = false,
}: {
  className?: string;
  /** Footer 版：基线向右延伸一段渐隐水平线 */
  withWaterline?: boolean;
}) {
  return (
    <span
      className={cn("pier-wordmark group/wordmark", className)}
      role="img"
      aria-label="Pier"
    >
      <span className="pier-wordmark-text" aria-hidden>
        {/* i 用 dotless ı（U+0131），tittle 由 accent 灯点接管 */}
        P<span className="pier-letter-i">
          ı
          <span className="pier-tittle pier-tittle-core" />
          <span className="pier-tittle pier-tittle-p1" />
          <span className="pier-tittle pier-tittle-p2" />
          <span className="pier-tittle pier-tittle-p3" />
        </span>er
      </span>
      {withWaterline && <span className="pier-wordmark-waterline" aria-hidden />}
    </span>
  );
}
