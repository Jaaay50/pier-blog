/**
 * 页面滚动进度指示器
 */
'use client';

import { useEffect, useState } from 'react';
import { gsap } from 'gsap';

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;
      setProgress(scrollPercent);
    };

    const handleScroll = () => {
      requestAnimationFrame(updateProgress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateProgress();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-1 z-[9999] pointer-events-none"
      style={{
        background: 'var(--bg-secondary)',
      }}
    >
      <div
        className="h-full transition-all duration-150 ease-out"
        style={{
          width: `${progress}%`,
          background: 'var(--gradient-brand)',
          boxShadow: '0 0 10px var(--glow-color)',
        }}
      />
    </div>
  );
}
