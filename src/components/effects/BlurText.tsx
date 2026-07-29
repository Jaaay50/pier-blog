"use client";

import { useEffect, useState } from "react";

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}

export function BlurText({
  text,
  className = "",
  delay = 0,
  staggerDelay = 50,
}: BlurTextProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <span className={`inline-flex flex-wrap ${className}`}>
      {text.split("").map((char, index) => (
        <span
          key={index}
          className="inline-block transition-all duration-500"
          style={{
            transitionDelay: `${index * staggerDelay}ms`,
            filter: isVisible ? "blur(0px)" : "blur(10px)",
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(5px)",
          }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}
