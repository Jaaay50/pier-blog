"use client";

import { useEffect } from "react";

/**
 * Phase 4：全局涟漪反馈。
 * 事件委托监听所有 button / a / [data-ripple] 的 pointerdown，
 * 从点击位置注入一次性涟漪元素，动画结束自动移除。
 * prefers-reduced-motion 与触控辅助场景自动跳过。
 */
export function RippleProvider() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement)?.closest?.(
        "button, a, [data-ripple]"
      ) as HTMLElement | null;
      if (!target) return;
      // 明确退出口
      if (target.dataset.noRipple !== undefined) return;

      const rect = target.getBoundingClientRect();
      // 超大区域（如整卡链接）不做涟漪，避免视觉噪音
      if (rect.width > 640 || rect.height > 400) return;

      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.className = "ripple-effect";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      // 目标元素需要相对定位与溢出裁剪才有内敛涟漪
      const style = getComputedStyle(target);
      if (style.position === "static") target.style.position = "relative";
      if (style.overflow !== "hidden") target.style.overflow = "hidden";

      target.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove(), {
        once: true,
      });
    };

    document.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return null;
}
