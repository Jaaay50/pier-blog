import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { CurrentsShell } from "@/components/currents/CurrentsShell";

/**
 * 潮汐 · Currents 统一产品外壳布局：
 * Navbar + 粘性侧栏（CurrentsShell）+ 页脚。
 * 各 page.tsx 只渲染页面内容本身，不再各自拼装 Navbar/SiteFooter。
 * 密度恢复脚本在 [locale]/layout.tsx，不受影响。
 */
export default function CurrentsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen">
      <Navbar />
      <CurrentsShell>{children}</CurrentsShell>
      <SiteFooter maxWidth="max-w-[1440px]" />
    </main>
  );
}
