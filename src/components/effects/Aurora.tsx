"use client";

import { useEffect, useRef } from "react";

interface AuroraProps {
  className?: string;
  colorStops?: string[];
  speed?: number;
}

export function Aurora({
  className = "",
  colorStops = ["#3b82f6", "#8b5cf6", "#06b6d4"],
  speed = 1,
}: AuroraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 0, g: 0, b: 0 };
    };

    const animate = () => {
      time += 0.003 * speed;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < colorStops.length; i++) {
        const color = hexToRgb(colorStops[i]);
        const x =
          canvas.width * (0.3 + 0.4 * Math.sin(time + i * 2.1));
        const y =
          canvas.height * (0.3 + 0.4 * Math.cos(time * 0.7 + i * 1.3));
        const radius = canvas.width * (0.3 + 0.1 * Math.sin(time * 0.5 + i));

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(
          0,
          `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`
        );
        gradient.addColorStop(
          0.5,
          `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`
        );
        gradient.addColorStop(
          1,
          `rgba(${color.r}, ${color.g}, ${color.b}, 0)`
        );

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animationId = requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [colorStops, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    />
  );
}
