'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

/**
 * 自定义光标（双环跟随）
 * 
 * 激活条件（全部满足才渲染）：
 * - 精确指针设备（鼠标/触控板）：(hover: hover) and (pointer: fine)
 * - 非减弱动效偏好：!(prefers-reduced-motion: reduce)
 * 
 * 渐进增强：
 * - 组件返回 null 或未挂载前，原生光标可见（html 无 .custom-cursor-on class）
 * - JS 挂载成功后添加 html class，CSS 才隐藏原生光标
 * 
 * 自愈机制：
 * - 每次 mousemove 强制显示光标，任何误隐藏在下一次移动即恢复
 * - documentElement mouseleave/enter 监听窗口边界，避免 DOM 节点移除触发误判
 * 
 * 修复列表：
 * - A. mouseout 误判：改用 documentElement mouseleave + mousemove 强制显示
 * - B. hidden 类名冲突：改为 is-hidden，只用 opacity
 * - C. 触屏笔记本无光标：改用 pointer/hover 媒体查询而非触摸嗅探
 * - D. 初始位置错位：首次 mousemove 前隐藏，淡入在正确坐标
 * - E. GSAP 覆写 transform：用 xPercent/yPercent 保持居中，x/y 共存
 * - F. 动态元素无 hover 态：事件委托 document，不逐元素绑定
 */
export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const [isPointer, setIsPointer] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // 初始隐藏，首次 mousemove 在正确位置淡入
  const [isEnabled, setIsEnabled] = useState(false);
  // 用 ref 镜像 isVisible，避免它进 effect 依赖导致事件重绑/quickTo 重建
  const isVisibleRef = useRef(false);

  useEffect(() => {
    // 能力查询：精确指针 + 非减弱动效
    const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const checkCapability = () => {
      const shouldEnable = finePointerQuery.matches && !reducedMotionQuery.matches;
      setIsEnabled(shouldEnable);

      // 控制原生光标显隐
      if (shouldEnable) {
        document.documentElement.classList.add('custom-cursor-on');
      } else {
        document.documentElement.classList.remove('custom-cursor-on');
      }
    };

    checkCapability();

    // 监听设备插拔（鼠标/触控板切换）
    finePointerQuery.addEventListener('change', checkCapability);
    reducedMotionQuery.addEventListener('change', checkCapability);

    return () => {
      finePointerQuery.removeEventListener('change', checkCapability);
      reducedMotionQuery.removeEventListener('change', checkCapability);
      document.documentElement.classList.remove('custom-cursor-on');
    };
  }, []);

  useEffect(() => {
    if (!isEnabled) return;

    const cursor = cursorRef.current;
    const cursorDot = cursorDotRef.current;
    if (!cursor || !cursorDot) return;

    // 设置居中偏移（与 x/y 共存不互斥）
    gsap.set([cursor, cursorDot], { xPercent: -50, yPercent: -50 });

    // 外圈使用 quickTo 优化（避免每次 mousemove 新建 tween）
    const quickX = gsap.quickTo(cursor, 'x', { duration: 0.6, ease: 'power2.out' });
    const quickY = gsap.quickTo(cursor, 'y', { duration: 0.6, ease: 'power2.out' });

    // 显隐控制（经 ref 去重，避免重复 setState）
    const show = () => {
      if (!isVisibleRef.current) {
        isVisibleRef.current = true;
        setIsVisible(true);
      }
    };
    const hide = () => {
      if (isVisibleRef.current) {
        isVisibleRef.current = false;
        setIsVisible(false);
      }
    };

    // 鼠标移动
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;

      // 内点即时跟随
      gsap.set(cursorDot, { x: clientX, y: clientY });

      // 外圈延迟跟随
      quickX(clientX);
      quickY(clientY);

      // 自愈机制：任何移动都强制显示（修复 DOM 移除误触发的隐藏）
      show();
    };

    // 可点击元素 hover 态：事件委托到 document（修复动态内容无监听）
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          'a, button, [role="button"], input, textarea, select, .cursor-pointer'
        )
      ) {
        setIsPointer(true);
      } else {
        setIsPointer(false);
      }
    };

    // 鼠标离开/进入窗口（监听 documentElement 而非 window，避免 DOM 移除误判）
    const handleMouseLeave = () => hide();
    const handleMouseEnter = () => show();

    // 绑定事件
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseover', handleMouseOver, { passive: true });
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.documentElement.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isEnabled]);

  // 不满足条件时不渲染（原生光标保持可见）
  if (!isEnabled) {
    return null;
  }

  return (
    <>
      {/* 外圈：延迟跟随 */}
      <div
        ref={cursorRef}
        className={`custom-cursor ${isPointer ? 'pointer' : ''} ${isVisible ? '' : 'is-hidden'}`}
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
          opacity: 0.6,
          transition: 'width 0.3s ease, height 0.3s ease, opacity 0.3s ease',
          mixBlendMode: 'difference',
        }}
      />

      {/* 内点：即时跟随 */}
      <div
        ref={cursorDotRef}
        className={`custom-cursor-dot ${isVisible ? '' : 'is-hidden'}`}
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
          mixBlendMode: 'difference',
          transition: 'opacity 0.2s ease',
        }}
      />

      <style jsx>{`
        .custom-cursor.pointer {
          width: 60px;
          height: 60px;
          opacity: 0.8;
          background-color: var(--accent-soft);
        }

        .custom-cursor.is-hidden,
        .custom-cursor-dot.is-hidden {
          opacity: 0;
          pointer-events: none;
        }
      `}</style>
    </>
  );
}
