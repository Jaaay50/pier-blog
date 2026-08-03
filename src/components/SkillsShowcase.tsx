"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useInView } from "motion/react";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { useWebGLQuality } from "@/lib/webgl";
import GradientText from "@/components/reactbits/GradientText";
import BlurText from "@/components/reactbits/BlurText";

// WebGL demo 懒加载（ogl 不进主 chunk）
const Particles = dynamic(() => import("@/components/reactbits/Particles"), { ssr: false });
const Aurora = dynamic(() => import("@/components/reactbits/Aurora"), { ssr: false });

interface Skill {
  title: string;
  desc: string;
}

interface SkillsShowcaseProps {
  title: string;
  subtitle: string;
  skills: {
    webgl: Skill;
    motion: Skill;
    craft: Skill;
  };
}

/**
 * 第二屏：技能展示
 * 3 张 SpotlightCard，视觉减法后的动效分工：
 * 1. WebGL 粒子 — 默认静态渐变，首次 hover 启动 Particles（启动后保持挂载）
 * 2. 动效工程 — Aurora 流光，本区块唯一默认运行的活 demo
 * 3. 像素级打磨 — GradientText 默认暂停，hover 时流动
 * 触屏设备无 hover：Card 1/3 保持静态（性能优先）
 * 滚动进入视口时 3D 飞入（rotateX + translateY + stagger）
 */
export function SkillsShowcase({ title, subtitle, skills }: SkillsShowcaseProps) {
  const { resolvedTheme } = useTheme();
  const quality = useWebGLQuality();
  // quality 挂载后才非 null，兼作水合门
  const mounted = quality !== null;
  const webglOk = !!quality?.enabled;
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-20% 0px" });

  // hover 门控：仅精确指针设备启用（触屏无 hover，永远静态）
  const [finePointer, setFinePointer] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFinePointer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Card 1：首次 hover 后挂载 Particles，之后保持（避免 WebGL context 反复创建/销毁）
  const [card1Live, setCard1Live] = useState(false);
  // Card 3：hover 期间 GradientText 流动，离开暂停
  const [card3Hovered, setCard3Hovered] = useState(false);

  const isDark = mounted && resolvedTheme === "dark";

  const spotlight = isDark
    ? ("rgba(106, 155, 204, 0.22)" as const)
    : ("rgba(217, 119, 87, 0.18)" as const);

  const cardVariants = {
    hidden: { opacity: 0, y: 120, rotateX: 18, scale: 0.92 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      rotateX: 0,
      scale: 1,
      transition: {
        duration: 0.9,
        delay: i * 0.18,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    }),
  };

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen items-center px-6 py-24"
    >
      <div className="mx-auto w-full max-w-6xl">
        {/* 标题 */}
        <div className="mb-16 text-center">
          <h2 className="font-display mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
            {inView ? (
              <BlurText
                text={title}
                delay={60}
                animateBy="letters"
                direction="top"
                className="justify-center"
              />
            ) : (
              <span className="opacity-0">{title}</span>
            )}
          </h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-[var(--text-muted)]"
          >
            {subtitle}
          </motion.p>
        </div>

        {/* 3D 飞入卡片，透视容器 */}
        <div
          className="grid gap-6 md:grid-cols-3"
          style={{ perspective: "1200px" }}
        >
          {/* Card 1: WebGL 粒子（活 demo） */}
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate={inView ? "show" : "hidden"}
          >
            <SpotlightCard
              spotlightColor={spotlight}
              className="group h-full !p-0 overflow-hidden"
            >
              <div
                className="relative h-44 overflow-hidden"
                onMouseEnter={() => {
                  if (finePointer && webglOk) setCard1Live(true);
                }}
              >
                {mounted && webglOk && card1Live ? (
                  <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Particles
                      particleCount={Math.round(160 * (quality?.particleMultiplier ?? 1))}
                      particleSpread={8}
                      speed={0.25}
                      particleColors={
                        isDark
                          ? ["#6a9bcc", "#8b7fcc", "#ffffff"]
                          : ["#d97757", "#d4a27f", "#3d3d3a"]
                      }
                      moveParticlesOnHover={quality?.mouseInteraction}
                      particleHoverFactor={2}
                      particleBaseSize={80}
                      alphaParticles
                      pixelRatio={quality?.dpr ?? 1}
                      className="absolute inset-0"
                    />
                  </motion.div>
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: isDark
                        ? "radial-gradient(ellipse at 50% 60%, rgba(106,155,204,0.25), transparent 70%)"
                        : "radial-gradient(ellipse at 50% 60%, rgba(217,119,87,0.2), transparent 70%)",
                    }}
                  />
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--bg-card)] to-transparent" />
              </div>
              <div className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
                  {skills.webgl.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {skills.webgl.desc}
                </p>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Card 2: 动效工程（Aurora 活 demo） */}
          <motion.div
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate={inView ? "show" : "hidden"}
            className="md:-translate-y-6"
          >
            <SpotlightCard
              spotlightColor={spotlight}
              className="group h-full !p-0 overflow-hidden"
            >
              <div className="relative h-44 overflow-hidden">
                {mounted && webglOk ? (
                  <div className="absolute inset-0">
                    <Aurora
                      colorStops={
                        isDark
                          ? ["#6a9bcc", "#8b7fcc", "#a78bfa"]
                          : ["#d97757", "#e8c4a0", "#c6613f"]
                      }
                      amplitude={1.4}
                      blend={0.8}
                    />
                  </div>
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: isDark
                        ? "linear-gradient(120deg, rgba(106,155,204,0.3), rgba(139,127,204,0.2), rgba(167,139,250,0.25))"
                        : "linear-gradient(120deg, rgba(217,119,87,0.3), rgba(232,196,160,0.25), rgba(198,97,63,0.2))",
                    }}
                  />
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--bg-card)] to-transparent" />
              </div>
              <div className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
                  {skills.motion.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {skills.motion.desc}
                </p>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Card 3: 像素级打磨（GradientText + 微型色板 demo） */}
          <motion.div
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate={inView ? "show" : "hidden"}
          >
            <SpotlightCard
              spotlightColor={spotlight}
              className="group h-full !p-0 overflow-hidden"
            >
              <div
                className="relative flex h-44 flex-col items-center justify-center gap-4 overflow-hidden"
                onMouseEnter={() => setCard3Hovered(true)}
                onMouseLeave={() => setCard3Hovered(false)}
              >
                <GradientText
                  colors={
                    isDark
                      ? ["#6a9bcc", "#8b7fcc", "#a78bfa", "#6a9bcc"]
                      : ["#d97757", "#c6613f", "#d4a27f", "#d97757"]
                  }
                  animationSpeed={4}
                  paused={finePointer ? !card3Hovered : true}
                  className="text-3xl font-bold"
                >
                  Aa
                </GradientText>
                {/* 微型色板：hover 时依次点亮 */}
                <div className="flex gap-2">
                  {(isDark
                    ? ["#0f0f0f", "#1a1a1a", "#6a9bcc", "#8b7fcc", "#f5f5f5"]
                    : ["#faf9f5", "#f0eee6", "#d97757", "#d4a27f", "#3d3d3a"]
                  ).map((c, i) => (
                    <motion.span
                      key={c}
                      className="h-6 w-6 rounded-full border border-[var(--border)]"
                      style={{ backgroundColor: c }}
                      initial={{ scale: 0 }}
                      animate={inView ? { scale: 1 } : {}}
                      transition={{ delay: 1 + i * 0.1, type: "spring", stiffness: 300 }}
                      whileHover={{ scale: 1.35, y: -4 }}
                    />
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--bg-card)] to-transparent" />
              </div>
              <div className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
                  {skills.craft.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {skills.craft.desc}
                </p>
              </div>
            </SpotlightCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
