"use client";

import { useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring } from "motion/react";
import BlurText from "@/components/reactbits/BlurText";

interface Project {
  name: string;
  desc: string;
  stars: string;
  forks: string;
  url: string;
  size: "large" | "medium" | "small";
}

interface ProjectsBentoProps {
  title: string;
  projects: Project[];
}

/**
 * 第三屏：项目展示 Bento Grid
 * - 不规则网格（CSS Grid 指定 span）
 * - hover 时当前卡片放大 1.15，其他缩小 0.9
 * - 磁吸光标（鼠标靠近边缘时卡片微偏移）
 * - 滚动入场 stagger
 */
export function ProjectsBento({ title, projects }: ProjectsBentoProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-15% 0px" });

  const gridSpans = [
    "md:col-span-2 md:row-span-2", // large: 第一个占 2x2
    "md:col-span-1 md:row-span-1", // medium
    "md:col-span-1 md:row-span-1", // medium
    "md:col-span-2 md:row-span-1", // large: 最后一个占 2x1
  ];

  return (
    <section ref={sectionRef} className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        {/* 标题 */}
        <div className="mb-16">
          <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            {inView ? (
              <BlurText
                text={title}
                delay={60}
                animateBy="letters"
                direction="top"
                className="justify-start"
              />
            ) : (
              <span className="opacity-0">{title}</span>
            )}
          </h2>
        </div>

        {/* Bento 网格 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-3">
          {projects.map((project, i) => (
            <ProjectCard
              key={project.name}
              project={project}
              index={i}
              isHovered={hoveredIndex === i}
              isOtherHovered={hoveredIndex !== null && hoveredIndex !== i}
              onHover={() => setHoveredIndex(i)}
              onLeave={() => setHoveredIndex(null)}
              gridSpan={gridSpans[i] || ""}
              inView={inView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface ProjectCardProps {
  project: Project;
  index: number;
  isHovered: boolean;
  isOtherHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  gridSpan: string;
  inView: boolean;
}

function ProjectCard({
  project,
  index,
  isHovered,
  isOtherHovered,
  onHover,
  onLeave,
  gridSpan,
  inView,
}: ProjectCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);

  // 磁吸偏移走 motion value + spring，完全绕过 React 重新渲染
  const magnetX = useMotionValue(0);
  const magnetY = useMotionValue(0);
  const springX = useSpring(magnetX, { stiffness: 300, damping: 30 });
  const springY = useSpring(magnetY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!cardRef.current) return;
    // Phase 4：触控设备不做磁吸偏移（tap 无 hover 语义）
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    magnetX.set((e.clientX - centerX) / 8);
    magnetY.set((e.clientY - centerY) / 8);
  };

  const handleMouseLeave = () => {
    magnetX.set(0);
    magnetY.set(0);
    onLeave();
  };

  return (
    <motion.div
      className={gridSpan}
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{
        opacity: { duration: 0.6, delay: index * 0.12 },
        y: { duration: 0.8, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] },
        scale: { duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] },
      }}
    >
    <motion.a
      ref={cardRef}
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card-interactive group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl p-6"
      onMouseMove={handleMouseMove}
      onMouseEnter={onHover}
      onMouseLeave={handleMouseLeave}
      onTouchStart={onHover}
      onTouchEnd={handleMouseLeave}
      style={{ x: springX, y: springY }}
      animate={{ scale: isHovered ? 1.05 : isOtherHovered ? 0.95 : 1 }}
      transition={{ scale: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
    >
      {/* 项目名 */}
      <div className="mb-4">
        <h3 className="mb-2 text-xl font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
          {project.name}
        </h3>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {project.desc}
        </p>
      </div>

      {/* 底部：Stars / Forks */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
          </svg>
          {project.stars}
        </span>
        <span className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 16 16">
            <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
          </svg>
          {project.forks}
        </span>
        <span className="ml-auto rounded-full bg-[var(--bg-primary)] px-2 py-0.5">
          TypeScript
        </span>
      </div>
    </motion.a>
    </motion.div>
  );
}
