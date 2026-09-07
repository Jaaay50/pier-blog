import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { CurrentsShell } from "@/components/currents/CurrentsShell";
import { PageHero } from "@/components/PageHero";
import { getTranslations } from "next-intl/server";

/**
 * 潮汐 · Currents 统一产品外壳布局：
 * Navbar + 粘性侧栏（CurrentsShell）+ 页脚。
 * 各 page.tsx 只渲染页面内容本身，不再各自拼装 Navbar/SiteFooter。
 * 密度恢复脚本在 [locale]/layout.tsx，不受影响。
 */
export default async function CurrentsLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "currents" });
  const tNav = await getTranslations({ locale, namespace: "currentsNav" });
  return (
    <main className="relative min-h-screen">
      <Navbar />
      <CurrentsShell homeHeader={<PageHero label={tNav("brandTagline")} title={t("title")} description={t("subtitle")} />}>
        {children}
      </CurrentsShell>
      <SiteFooter />
    </main>
  );
}
