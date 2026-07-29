"use client";

import { ReactNode } from "react";

interface GradientTextProps {
  children: ReactNode;
  className?: string;
}

export function GradientText({ children, className = "" }: GradientTextProps) {
  return (
    <span
      className={`inline-block bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-transparent ${className}`}
      style={{
        backgroundSize: "200% auto",
        animation: "shimmer 4s linear infinite",
      }}
    >
      {children}
    </span>
  );
}
