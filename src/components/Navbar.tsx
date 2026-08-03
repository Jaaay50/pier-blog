"use client";

import { usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { SearchModal } from "./SearchModal";
import { TransitionLink } from "./TransitionLink";
import { MagneticWrapper } from "./MagneticWrapper";
import { PierWordmark } from "./brand/PierWordmark";

export function Navbar() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("nav");

  const navLinks = [
    { href: "/blog", label: t("blog") },
    { href: "/portfolio", label: t("portfolio") },
    { href: "/lab", label: t("lab") },
    { href: "/about", label: t("about") },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="flex items-center justify-between">
          <MagneticWrapper strength={0.2}>
            <TransitionLink
              href="/"
              aria-label="Pier"
              className="text-lg transition-opacity hover:opacity-90"
            >
              <PierWordmark />
            </TransitionLink>
          </MagneticWrapper>
          <div className="flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <span key={link.href} className="relative">
                  <TransitionLink
                    href={link.href}
                    className={`text-sm transition-colors ${
                      isActive
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {link.label}
                  </TransitionLink>
                  {/* Phase 4：当前路由弹性下划线（layoutId 跨链接滑动）
                      key 绑定 locale：语言切换时下划线 remount 直接出现在新位置，
                      不做跨文案宽度的弹簧滑动；同 locale 页面间导航保留滑动 */}
                  {isActive && (
                    <motion.span
                      key={`${locale}-nav-underline`}
                      layoutId="nav-underline"
                      className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-[var(--accent)]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </span>
              );
            })}
            <SearchModal />
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
