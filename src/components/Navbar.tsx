"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { SearchModal } from "./SearchModal";
import { TransitionLink } from "./TransitionLink";
import { MagneticWrapper } from "./MagneticWrapper";

export function Navbar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const navLinks = [
    { href: "/blog", label: t("blog") },
    { href: "/portfolio", label: t("portfolio") },
    { href: "/about", label: t("about") },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="flex items-center justify-between">
          <MagneticWrapper strength={0.2}>
            <TransitionLink
              href="/"
              className="text-lg font-semibold tracking-tight transition-colors hover:text-[var(--accent)]"
            >
              Pier
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
                  {/* Phase 4：当前路由弹性下划线（layoutId 跨链接滑动） */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-[var(--accent)]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </span>
              );
            })}
            <a
              href="https://github.com/Jia-Ethan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {t("github")}
            </a>
            <SearchModal />
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
