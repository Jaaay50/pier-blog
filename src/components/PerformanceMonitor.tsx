'use client';

import { useEffect, useState } from 'react';

export function PerformanceMonitor() {
  const [fps, setFps] = useState(60);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 只在开发环境显示
    if (process.env.NODE_ENV !== 'development') return;

    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      const elapsed = currentTime - lastTime;

      if (elapsed >= 1000) {
        setFps(Math.round((frameCount * 1000) / elapsed));
        frameCount = 0;
        lastTime = currentTime;
      }

      rafId = requestAnimationFrame(measureFPS);
    };

    rafId = requestAnimationFrame(measureFPS);

    // 键盘快捷键：Shift + P 切换显示
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'P') {
        setVisible((v) => !v);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (process.env.NODE_ENV !== 'development' || !visible) {
    return null;
  }

  const fpsColor = fps >= 55 ? '#10b981' : fps >= 30 ? '#f59e0b' : '#ef4444';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '12px 16px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: '#fff',
        borderRadius: '8px',
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        fontSize: '14px',
        zIndex: 10000,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: fpsColor,
          }}
        />
        <span>
          FPS: <strong style={{ color: fpsColor }}>{fps}</strong>
        </span>
      </div>
      <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.6 }}>
        Press Shift+P to toggle
      </div>
    </div>
  );
}
