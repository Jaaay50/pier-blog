"use client";

import { useTheme } from "next-themes";
import { ReactNode } from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform } from "motion/react";
import { StaticHeroFallback } from "@/components/StaticHeroFallback";
import { FloatingShapes } from "@/components/FloatingShapes";
import { useWebGLQuality } from "@/lib/webgl";
import BlurText from "@/components/reactbits/BlurText";
import ShinyText from "@/components/reactbits/ShinyText";

// WebGL 背景懒加载（ogl 不进首屏主 chunk）
const Galaxy = dynamic(() => import("@/components/reactbits/Galaxy"), {
  ssr: false,
});
const Aurora = dynamic(() => import("@/components/reactbits/Aurora"), {
  ssr: false,
});

interface ImmersiveHeroProps {
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  scrollHint: string;
  children?: ReactNode; // CTA buttons
}

/**
 * 全屏沉浸式 Hero：
 * - 深色（Kimi）：高密度 Galaxy 星空 + 逐字解密标题 + 金属流光副标题
 * - 浅色（Claude）：Aurora 暖极光 + 逐字模糊揭示 + 衬线优雅
 * - 滚动视差：滚出首屏时标题上浮淡出
 * - 性能降级：WebGL 不可用 / 低端设备 / prefers-reduced-motion 时
 *   渲染纯 CSS 静态背景；中端设备降 dpr 与关闭鼠标交互
 */
export function ImmersiveHero({
  titleLine1,
  titleLine2,
  subtitle,
  scrollHint,
  children,
}: ImmersiveHeroProps) {
  const { resolvedTheme } = useTheme();
  const quality = useWebGLQuality();
  // quality 挂载后才非 null，兼作水合门
  const mounted = quality !== null;
  const { scrollY } = useScroll();

  // 滚动视差：标题上浮 + 淡出，背景放大
  const contentY = useTransform(scrollY, [0, 600], [0, -120]);
  const contentOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const bgScale = useTransform(scrollY, [0, 800], [1, 1.15]);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* ===== 全屏背景 ===== */}
      <motion.div className="absolute inset-0" style={{ scale: bgScale }}>
        {!mounted || !quality ? (
          <div className="absolute inset-0 bg-[var(--bg-primary)]" />
        ) : !quality.enabled ? (
          <StaticHeroFallback isDark={isDark} />
        ) : isDark ? (
          <div className="absolute inset-0 opacity-70">
            <Galaxy
              mouseInteraction={quality.mouseInteraction}
              mouseRepulsion={quality.mouseInteraction}
              repulsionStrength={2.5}
              density={2 * quality.particleMultiplier}
              starSpeed={0.4}
              glowIntensity={0.5}
              twinkleIntensity={0.5}
              hueShift={220}
              saturation={0.4}
              rotationSpeed={0.05}
              dpr={quality.dpr}
            />
          </div>
        ) : (
          <div className="absolute inset-0 opacity-60">
            <Aurora
              colorStops={["#d97757", "#e8c4a0", "#c6613f"]}
              amplitude={1.2}
              blend={0.65}
            />
          </div>
        )}
      </motion.div>

      {/* 前景浮动几何层 */}
      {mounted && <FloatingShapes />}

      {/* 底部渐隐，衔接下一屏 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />

      {/* ===== 内容 ===== */}
      <motion.div
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        {/* Apple 风格双行大标题：手写体 Hello / 你好 */}
        <h1 className="mb-10 leading-none tracking-tight select-none">
          {/* SSR / 水合前：立即可见，防止 LCP 延迟 */}
          {!mounted ? (
            <span
              className="block font-dancing text-[clamp(7rem,20vw,18rem)] text-[var(--text-primary)]"
              style={{ fontFamily: "var(--font-dancing), cursive" }}
            >
              {titleLine1}
            </span>
          ) : (
            <>
              {/* 第一行：主词（Hello 或 你好） */}
              <BlurText
                text={titleLine1}
                delay={90}
                animateBy="letters"
                direction="bottom"
                stepDuration={0.55}
                className="justify-center font-dancing text-[clamp(7rem,20vw,18rem)] leading-none text-[var(--text-primary)]"
              />
              {/* 第二行：次词，字号更小，带渐变色，错落感 */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="mt-2"
              >
                <span
                  className={`font-dancing text-[clamp(3rem,8vw,7rem)] leading-none ${
                    isDark
                      ? "bg-gradient-to-r from-[#6a9bcc] via-[#8b7fcc] to-[#a78bfa] bg-clip-text text-transparent"
                      : "bg-gradient-to-r from-[#d97757] via-[#c6613f] to-[#d4a27f] bg-clip-text text-transparent"
                  }`}
                  style={{ fontFamily: "var(--font-dancing), cursive" }}
                >
                  {titleLine2}
                </span>
              </motion.div>
            </>
          )}
        </h1>

        {/* 副标题 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.3 }}
          className="mb-12 max-w-xl"
        >
          <ShinyText
            text={subtitle}
            speed={3}
            color={isDark ? "#a1a1a1" : "#5e5d59"}
            shineColor={isDark ? "#e0ecff" : "#d97757"}
            className="text-base leading-relaxed tracking-wide md:text-lg"
          />
        </motion.div>

        {/* CTA：单按钮，轻量 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.7 }}
        >
          {children}
        </motion.div>
      </motion.div>

      {/* ===== 滚动提示：纯图标，无文字 ===== */}
      <motion.div
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-[var(--text-muted)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4, duration: 1 }}
        style={{ opacity: contentOpacity }}
      >
        <motion.svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </motion.svg>
      </motion.div>
    </section>
  );
}
