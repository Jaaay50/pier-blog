"use client";

import { useTheme } from "next-themes";
import { ReactNode } from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform } from "motion/react";
import { useLocale } from "next-intl";
import { StaticHeroFallback } from "@/components/StaticHeroFallback";
import { FloatingShapes } from "@/components/FloatingShapes";
import { useWebGLQuality } from "@/lib/webgl";
import ShinyText from "@/components/reactbits/ShinyText";
import DecryptedText from "@/components/reactbits/DecryptedText";
import BlurText from "@/components/reactbits/BlurText";

// WebGL 背景懒加载
const Galaxy = dynamic(() => import("@/components/reactbits/Galaxy"), {
  ssr: false,
});
const Aurora = dynamic(() => import("@/components/reactbits/Aurora"), {
  ssr: false,
});

interface ImmersiveHeroProps {
  title: string;
  subtitle: string;
  children?: ReactNode;
}

/**
 * 全屏沉浸式 Hero
 * - 深色：Galaxy 星空 + 逐字解密标题
 * - 浅色：Aurora 暖极光 + 逐字模糊揭示
 * - 稳定、简洁的文字动效
 */
export function ImmersiveHero({
  title,
  subtitle,
  children,
}: ImmersiveHeroProps) {
  const { resolvedTheme } = useTheme();
  const quality = useWebGLQuality();
  const locale = useLocale();
  const mounted = quality !== null;
  const { scrollY } = useScroll();

  const contentY = useTransform(scrollY, [0, 600], [0, -120]);
  const contentOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const bgScale = useTransform(scrollY, [0, 800], [1, 1.15]);

  const isDark = mounted && resolvedTheme === "dark";
  const isZh = locale === "zh";

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* 全屏背景 */}
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

      {/* 底部渐隐 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />

      {/* 内容 */}
      <motion.div
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        {/* 主标题 */}
        <h1 className="font-display mb-8 text-4xl leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          {!mounted ? (
            <span className="text-[var(--text-primary)]">{title}</span>
          ) : isDark ? (
            <DecryptedText
              text={title}
              animateOn="view"
              sequential
              speed={isZh ? 45 : 35}
              revealDirection="start"
              className="text-[var(--text-primary)]"
              encryptedClassName="text-[var(--accent)]/40"
            />
          ) : (
            <BlurText
              text={title}
              delay={isZh ? 70 : 50}
              animateBy="letters"
              direction="bottom"
              className="justify-center text-[var(--text-primary)]"
            />
          )}
        </h1>

        {/* 副标题 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.2 }}
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

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
        >
          {children}
        </motion.div>
      </motion.div>

      {/* 滚动提示 */}
      <motion.div
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-[var(--text-muted)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
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
