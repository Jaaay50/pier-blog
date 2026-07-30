'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const [isPointer, setIsPointer] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    const cursorDot = cursorDotRef.current;
    if (!cursor || !cursorDot) return;

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouchDevice || reducedMotion) {
      cursor.style.display = 'none';
      cursorDot.style.display = 'none';
      return;
    }

    let mouseX = 0;
    let mouseY = 0;

    // 鼠标移动
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      gsap.to(cursorDot, {
        x: mouseX,
        y: mouseY,
        duration: 0,
      });

      gsap.to(cursor, {
        x: mouseX,
        y: mouseY,
        duration: 0.6,
        ease: 'power2.out',
      });
    };

    // 检测可点击元素
    const handleMouseEnter = () => setIsPointer(true);
    const handleMouseLeave = () => setIsPointer(false);

    // 鼠标离开窗口
    const handleMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget) {
        setIsHidden(true);
      }
    };

    const handleMouseEnterWindow = () => setIsHidden(false);

    // 绑定事件
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('mouseenter', handleMouseEnterWindow);

    // 给所有可点击元素添加监听
    const clickableElements = document.querySelectorAll(
      'a, button, [role="button"], input, textarea, select, .cursor-pointer'
    );

    clickableElements.forEach((el) => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('mouseenter', handleMouseEnterWindow);

      clickableElements.forEach((el) => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, []);

  return (
    <>
      {/* 外圈：延迟跟随 */}
      <div
        ref={cursorRef}
        className={`custom-cursor ${isPointer ? 'pointer' : ''} ${isHidden ? 'hidden' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '40px',
          height: '40px',
          border: '2px solid var(--accent)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9999,
          transform: 'translate(-50%, -50%)',
          opacity: 0.6,
          transition: 'width 0.3s ease, height 0.3s ease, opacity 0.3s ease',
          mixBlendMode: 'difference',
        }}
      />

      {/* 内点：即时跟随 */}
      <div
        ref={cursorDotRef}
        className={`custom-cursor-dot ${isHidden ? 'hidden' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '8px',
          height: '8px',
          backgroundColor: 'var(--accent)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9999,
          transform: 'translate(-50%, -50%)',
          mixBlendMode: 'difference',
        }}
      />

      <style jsx>{`
        .custom-cursor.pointer {
          width: 60px;
          height: 60px;
          opacity: 0.8;
          background-color: var(--accent-soft);
        }

        .custom-cursor.hidden,
        .custom-cursor-dot.hidden {
          opacity: 0;
        }

        @media (max-width: 768px) {
          .custom-cursor,
          .custom-cursor-dot {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
