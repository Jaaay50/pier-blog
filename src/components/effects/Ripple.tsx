"use client";

import { useEffect, useRef } from "react";

interface RippleProps {
  className?: string;
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
}

export function Ripple({
  className = "",
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
}: RippleProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const circles: HTMLElement[] = [];

    for (let i = 0; i < numCircles; i++) {
      const circle = document.createElement("div");
      circle.className = "absolute rounded-full bg-[var(--accent)] animate-ripple";
      circle.style.width = `${mainCircleSize + i * 70}px`;
      circle.style.height = `${mainCircleSize + i * 70}px`;
      circle.style.opacity = `${mainCircleOpacity * (1 - i / numCircles)}`;
      circle.style.animationDelay = `${i * 0.06}s`;
      circle.style.top = "50%";
      circle.style.left = "50%";
      circle.style.transform = "translate(-50%, -50%) scale(1)";
      
      container.appendChild(circle);
      circles.push(circle);
    }

    // Add keyframes if not already present
    if (!document.getElementById("ripple-keyframes")) {
      const style = document.createElement("style");
      style.id = "ripple-keyframes";
      style.textContent = `
        @keyframes ripple {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(0.9);
          }
        }
        .animate-ripple {
          animation: ripple 3s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      circles.forEach((circle) => circle.remove());
    };
  }, [mainCircleSize, mainCircleOpacity, numCircles]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 ${className}`}
      aria-hidden="true"
    />
  );
}
