/**
 * 页面滚动进度指示器
 * 性能优化：用 ref 直接操作 DOM 的 width style，完全跳过 React 重新渲染。
 */
'use client';

import { useEffect, useRef } from 'react';

export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let rafId: number | null = null;

    const updateProgress = () => {
      rafId = null;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = `${pct}%`;
    };

    const handleScroll = () => {
      // 每帧最多执行一次（debounce to rAF）
      if (rafId === null) {
        rafId = requestAnimationFrame(updateProgress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateProgress();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-1 z-[9999] pointer-events-none"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div
        ref={barRef}
        style={{
          width: '0%',
          height: '100%',
          background: 'var(--gradient-brand)',
          boxShadow: '0 0 10px var(--glow-color)',
        }}
      />
    </div>
  );
}
