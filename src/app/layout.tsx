import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pier — Frontend Engineer",
  description:
    "Personal blog and portfolio. Exploring the intersection of AI, interaction design, and modern web engineering.",
  openGraph: {
    title: "Pier — Frontend Engineer",
    description:
      "Personal blog and portfolio. Exploring the intersection of AI, interaction design, and modern web engineering.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[var(--bg-primary)] antialiased">
        <ThemeProvider>
          <div className="relative">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
