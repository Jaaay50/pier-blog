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
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif",
  display: "swap",
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dancing",
  display: "swap",
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
