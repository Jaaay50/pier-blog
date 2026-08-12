"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

interface BlogProseGuardProps {
  children: React.ReactNode;
}

/**
 * 判断元素是否属于允许复制的区域：
 * - pre、code（代码块复制按钮已有单独处理）
 * - 链接
 * - 表单元素
 * - contenteditable
 * - 显式 data-copy-allow
 *
 * 模块级纯函数，不依赖组件状态。
 */
function isAllowedElement(el: Element | null): boolean {
  let current: Element | null = el;
  while (current) {
    const tag = current.tagName.toLowerCase();
    if (tag === "pre" || tag === "code") return true;
    if (tag === "a") return true;
    if (tag === "button" || tag === "input" || tag === "textarea" || tag === "select") return true;
    if (current.hasAttribute("contenteditable")) return true;
    if (current.hasAttribute("data-copy-allow")) return true;
    current = current.parentElement;
  }
  return false;
}

/** 取节点自身（元素）或其父元素。 */
function toElement(node: Node): Element | null {
  return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
}

/**
 * 博客正文复制边界：降低原创正文被直接选择、复制和右键提取的便利度。
 *
 * 实现：
 * - 正文区域应用 user-select: none（CSS class prose-guarded）
 * - 允许区域显式恢复 user-select: text：pre/code、链接、表单元素、[data-copy-allow]
 * - copy 事件（document 级）：验证 Selection/Range 是否触及受保护正文；
 *   一个 range 完全位于允许区域 ⟺ 其 commonAncestorContainer 位于允许元素内，
 *   因此跨允许区域边界的混合选择（含跨 guard 边界）必然被阻止
 * - contextmenu 事件：只在受保护正文且目标不属于允许区域时阻止
 * - 阻止时显示约 2 秒轻量提示（aria-live="polite"）
 *
 * 约束：
 * - 不改 DOM 正文、不删 RSS、不做文字转图片或混淆
 * - 不全局拦截键盘、不限制开发者工具
 * - 浏览器查找、屏幕阅读、打印、SEO 不受影响
 * - 明确定位为"复制阻力"，不宣称内容不可复制
 */
export function BlogProseGuard({ children }: BlogProseGuardProps) {
  const t = useTranslations("blog");
  const [showToast, setShowToast] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setShowToast(true);
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
      toastTimerRef.current = null;
    }, 2000);
  }, []);

  /**
   * 检查 Selection 是否触及受保护正文（root 内的非允许区域）。
   *
   * 对每个非 collapsed range：
   * - commonAncestor 在 root 内：range 完全位于允许元素内才安全
   *   （从允许区域 A 跨正文选到允许区域 B 时，commonAncestor 落在正文上，被判定触及）
   * - commonAncestor 在 root 外且 range 与 root 相交：选择跨越 guard 边界，
   *   必然覆盖部分受保护内容，判定触及
   * - 其余情况（选择完全在 guard 外）：与本 guard 无关
   */
  const selectionTouchesProtected = useCallback((selection: Selection): boolean => {
    const root = rootRef.current;
    if (!root) return false;

    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i);
      if (range.collapsed) continue;

      const commonElement = toElement(range.commonAncestorContainer);
      if (!commonElement) continue;

      if (root.contains(commonElement)) {
        if (!isAllowedElement(commonElement)) return true;
      } else if (commonElement.contains(root) && range.intersectsNode(root)) {
        return true;
      }
    }

    return false;
  }, []);

  const handleCopy = useCallback(
    (e: ClipboardEvent) => {
      const root = rootRef.current;
      if (!root) return;

      const selection = window.getSelection();
      const target = e.target instanceof Element ? e.target : null;

      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        // document selection 不可用（如 input/textarea 内部选择不反映在
        // window.getSelection 中）：退回按事件目标判断，且只管 guard 内的目标
        if (target && root.contains(target) && !isAllowedElement(target)) {
          e.preventDefault();
          displayToast();
        }
        return;
      }

      if (selectionTouchesProtected(selection)) {
        e.preventDefault();
        displayToast();
      }
    },
    [selectionTouchesProtected, displayToast],
  );

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      const target = e.target as Element;
      const root = rootRef.current;

      // 如果目标不在 guard 根内，或属于允许元素，放行
      if (!root || !root.contains(target) || isAllowedElement(target)) {
        return;
      }

      // 受保护正文区域，阻止右键
      e.preventDefault();
      displayToast();
    },
    [displayToast],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // copy 必须在 document 级监听：跨 guard 边界的选择触发 copy 时，
    // 事件 target 可能在 guard 外，root 上的监听器不会触发
    document.addEventListener("copy", handleCopy);
    root.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("copy", handleCopy);
      root.removeEventListener("contextmenu", handleContextMenu);
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [handleCopy, handleContextMenu]);

  return (
    <div ref={rootRef} className="relative">
      <div className="prose-guarded prose max-w-none">{children}</div>

      {/* 轻量提示：约 2 秒后自动消失 */}
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[var(--border-hover)] bg-[var(--bg-card)]/95 px-4 py-2.5 text-sm text-[var(--text-secondary)] shadow-lg backdrop-blur-sm"
        >
          {t("copyRestricted")}
        </div>
      )}
    </div>
  );
}
