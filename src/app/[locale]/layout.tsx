import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4, Dancing_Script } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AnimationProvider } from "@/components/AnimationProvider";
import { CustomCursor } from "@/components/CustomCursor";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { SpeculationRules } from "@/components/SpeculationRules";
import { ParticleGateScript } from "@/components/ParticleGate";
import { locales, type Locale } from "@/i18n/config";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif",
  display: "swap",
  preload: false,
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
  variable: "--font-dancing",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ethanpier.com"),
  title: "Pier — Frontend Engineer",
  description:
    "Personal blog and portfolio. Exploring the intersection of AI, interaction design, and modern web engineering.",
  alternates: {
    types: {
      "application/rss+xml": [
        { url: "/feed.xml", title: "Ethan Pier — Blog (English)" },
        { url: "/feed-zh.xml", title: "Ethan Pier — 博客（中文）" },
      ],
    },
  },
  openGraph: {
    title: "Pier — Frontend Engineer",
    description:
      "Personal blog and portfolio. Exploring the intersection of AI, interaction design, and modern web engineering.",
    type: "website",
    images: [
      {
        url: "https://ethanpier.com/og?title=Pier%20%E2%80%94%20Frontend%20Engineer&description=Personal%20blog%20and%20portfolio%20by%20Ethan%20Pier",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pier — Frontend Engineer",
    description:
      "Personal blog and portfolio. Exploring the intersection of AI, interaction design, and modern web engineering.",
    images: [
      "https://ethanpier.com/og?title=Pier%20%E2%80%94%20Frontend%20Engineer&description=Personal%20blog%20and%20portfolio%20by%20Ethan%20Pier",
    ],
  },
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

// 構建時為每個 locale 靜態生成
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // 靜態渲染關鍵：向 next-intl 聲明本次請求的 locale，
  // 之後 getTranslations/getMessages 不再依賴動態請求上下文
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      // 預設深色，與 ThemeProvider defaultTheme="dark" 一致。
      // 靜態 HTML 直接帶 dark class，避免水合前的淺→深閃白。
      // suppressHydrationWarning 允許 next-themes 在客戶端靜默覆寫此 class。
      className={`dark ${inter.variable} ${jetbrainsMono.variable} ${sourceSerif.variable} ${dancingScript.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* 首帧粒子门控：在浏览器解析 body 前同步判断 WebGL 能力，
            可用时打 data-particles-ready 标记，CSS 直接让 SSR 标题第一帧就透明 */}
        <ParticleGateScript />
      </head>
      <body className="min-h-screen bg-[var(--bg-primary)] antialiased">
        <SpeculationRules />
        <div className="ambient-bg" aria-hidden="true">
          <div className="ambient-glow ambient-glow-1" />
          <div className="ambient-glow ambient-glow-2" />
          <div className="ambient-glow ambient-glow-3" />
        </div>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <AnimationProvider>
              <CustomCursor />
              <PerformanceMonitor />
              <div className="relative">{children}</div>
            </AnimationProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
