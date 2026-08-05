"use client";

/**
 * 评分徽章（方案 13.8）：
 * - 80–100：accent 强调 + subtle glow
 * - 65–79：text-secondary + 边框增强
 * - <65：text-muted
 * 颜色之外必须保留数字本身。
 */
export function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <span className="rounded-full border border-dashed border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
        —
      </span>
    );
  }

  const tierClass =
    score >= 80
      ? "score-badge-high border-[var(--accent)]/60 text-[var(--accent)]"
      : score >= 65
        ? "border-[var(--border-hover)] text-[var(--text-secondary)]"
        : "border-[var(--border)] text-[var(--text-muted)]";

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${tierClass}`}
      aria-label={`score ${score}`}
    >
      {score}
    </span>
  );
}
