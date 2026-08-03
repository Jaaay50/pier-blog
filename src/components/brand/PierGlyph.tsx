/**
 * Π glyph：桥墩品牌符号。
 * 构型：一道横梁 + 两根入水桥桩（衬线桩脚外撇）+ 两桩之间负空间悬一颗灯点。
 * 灯点 = var(--accent)；结构线 = currentColor（跟随文字色，双主题自动适配）。
 * viewBox 0 0 48 48。
 */
export function PierGlyph({
  size = 24,
  className,
  glow = false,
}: {
  size?: number;
  className?: string;
  /** 404 水印等场景：灯点加微光 */
  glow?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
      role="presentation"
    >
      {/* 横梁：略带衬线感的圆角横木 */}
      <rect x="8" y="10" width="32" height="3.5" rx="1.75" fill="currentColor" />
      {/* 左桩：垂直，桩脚向左外撇 */}
      <path
        d="M15 13.5 V36 M15 36 L12.5 42 M15 36 L17.5 42"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 右桩 */}
      <path
        d="M33 13.5 V36 M33 36 L30.5 42 M33 36 L35.5 42"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 桩间灯点：悬在负空间中央偏上（水面之上） */}
      {glow && (
        <circle cx="24" cy="24" r="5" fill="var(--accent)" opacity="0.25" />
      )}
      <circle cx="24" cy="24" r="2.2" fill="var(--accent)" />
    </svg>
  );
}
