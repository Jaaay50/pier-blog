/**
 * Root layout — pass-through only.
 * next-intl URL-routing 模式：html/body 由 [locale]/layout.tsx 提供，
 * 这样 locale layout 可以直接設置 <html lang={locale}>，
 * 且根 layout 不调用任何动态 API，不阻止静态生成。
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
