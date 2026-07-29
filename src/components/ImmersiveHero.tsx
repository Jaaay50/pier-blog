"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, ReactNode } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import Galaxy from "@/components/reactbits/Galaxy";
import Aurora from "@/components/reactbits/Aurora";
import DecryptedText from "@/components/reactbits/DecryptedText";
import BlurText from "@/components/reactbits/BlurText";
import ShinyText from "@/components/reactbits/ShinyText";

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
 */
export function ImmersiveHero({
  titleLine1,
  titleLine2,
  subtitle,
  scrollHint,
  children,
}: ImmersiveHeroProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { scrollY } = useScroll();

  // 滚动视差：标题上浮 + 淡出，背景放大
  const contentY = useTransform(scrollY, [0, 600], [0, -120]);
  const contentOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const bgScale = useTransform(scrollY, [0, 800], [1, 1.15]);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* ===== 全屏背景 ===== */}
      <motion.div className="absolute inset-0" style={{ scale: bgScale }}>
        {!mounted ? (
          <div className="absolute inset-0 bg-[var(--bg-primary)]" />
        ) : isDark ? (
          <div className="absolute inset-0 opacity-70">
            <Galaxy
              mouseInteraction
              mouseRepulsion
              repulsionStrength={2.5}
              density={2}
              starSpeed={0.4}
              glowIntensity={0.5}
              twinkleIntensity={0.5}
              hueShift={220}
              saturation={0.4}
              rotationSpeed={0.05}
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

      {/* 底部渐隐，衔接下一屏 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />

      {/* ===== 内容 ===== */}
      <motion.div
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        {/* 主标题：深色逐字解密 / 浅色逐字模糊揭示 */}
        <h1 className="font-display mb-8 text-5xl leading-[1.1] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
          {!mounted ? (
            <span className="opacity-0">
              {titleLine1}
              <br />
              {titleLine2}
            </span>
          ) : isDark ? (
            <>
              <DecryptedText
                text={titleLine1}
                animateOn="view"
                sequential
                speed={40}
                revealDirection="start"
                className="text-[var(--text-primary)]"
                encryptedClassName="text-[var(--accent)]/40"
              />
              <br />
              <DecryptedText
                text={titleLine2}
                animateOn="view"
                sequential
                speed={55}
                revealDirection="start"
                className="bg-gradient-to-r from-[#6a9bcc] via-[#8b7fcc] to-[#a78bfa] bg-clip-text text-transparent"
                encryptedClassName="text-[var(--text-muted)]/40"
              />
            </>
          ) : (
            <>
              <BlurText
                text={titleLine1}
                delay={80}
                animateBy="letters"
                direction="bottom"
                className="justify-center text-[var(--text-primary)]"
              />
              <BlurText
                text={titleLine2}
                delay={120}
                animateBy="letters"
                direction="bottom"
                className="justify-center bg-gradient-to-r from-[#d97757] via-[#c6613f] to-[#d4a27f] bg-clip-text text-transparent"
              />
            </>
          )}
        </h1>

        {/* 副标题：深色金属流光 / 浅色衬线渐显 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.4 }}
          className="mb-12 max-w-2xl"
        >
          {isDark ? (
            <ShinyText
              text={subtitle}
              speed={3}
              color="#a1a1a1"
              shineColor="#e0ecff"
              className="text-lg leading-relaxed md:text-xl"
            />
          ) : (
            <ShinyText
              text={subtitle}
              speed={3}
              color="#5e5d59"
              shineColor="#d97757"
              className="text-lg leading-relaxed md:text-xl"
            />
          )}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.8 }}
          className="flex gap-4"
        >
          {children}
        </motion.div>
      </motion.div>

      {/* ===== 滚动提示 ===== */}
      <motion.div
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1 }}
        style={{ opacity: contentOpacity }}
      >
        <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
          <span className="text-xs tracking-[0.2em] uppercase">{scrollHint}</span>
          <motion.svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </motion.svg>
        </div>
      </motion.div>
    </section>
  );
}
