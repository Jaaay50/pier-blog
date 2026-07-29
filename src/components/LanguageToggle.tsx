"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, type Locale } from "@/i18n/config";

export function LanguageToggle() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("language");

  const handleToggle = () => {
    const nextLocale = locale === "en" ? "zh" : "en";
    
    startTransition(() => {
      document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000`;
      router.refresh();
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="group relative flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)] disabled:opacity-50"
      aria-label={t("switchTo")}
      title={t("switchTo")}
    >
      <svg
        className="h-4 w-4 text-[var(--text-secondary)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
      <span className="font-medium text-[var(--text-primary)]">
        {locale === "en" ? "中" : "EN"}
      </span>
    </button>
  );
}
