import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4, Dancing_Script } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AnimationProvider } from "@/components/AnimationProvider";
import { CustomCursor } from "@/components/CustomCursor";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { RippleProvider } from "@/components/RippleProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: true,          // 主 UI 字體，保留預載
  adjustFontFallback: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,         // 代碼塊次要字體，不阻 LCP
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600"],  // 500 用於 .dark .font-display，不可刪
  variable: "--font-serif",
  display: "swap",
  preload: false,         // 正文次要字體，不阻 LCP
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["700"],         // 只保留實際使用的最重 weight
  variable: "--font-dancing",
  display: "swap",
  preload: false,         // 裝飾字體，不阻 LCP
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${jetbrainsMono.variable} ${sourceSerif.variable} ${dancingScript.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-[var(--bg-primary)] antialiased">
        <div className="ambient-bg" aria-hidden="true">
          <div className="ambient-glow ambient-glow-1" />
          <div className="ambient-glow ambient-glow-2" />
          <div className="ambient-glow ambient-glow-3" />
        </div>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AnimationProvider>
              <CustomCursor />
              <PerformanceMonitor />
              <RippleProvider />
              <div className="relative">{children}</div>
            </AnimationProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
