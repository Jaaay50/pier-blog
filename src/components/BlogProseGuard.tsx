"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

interface BlogProseGuardProps {
  children: React.ReactNode;
}

const ALWAYS_ALLOWED_SELECTOR = "pre, code, a, button, input, textarea, select, [data-copy-allow]";
const EDITABLE_SELECTOR = '[contenteditable=""], [contenteditable="true" i], [contenteditable="plaintext-only" i]';

/**
 * 查找元素所属的允许复制区域：
 * - pre、code（代码块复制按钮已有单独处理）
 * - 链接
 * - 表单元素
 * - 实际启用的 contenteditable
 * - 显式 data-copy-allow
 */
function findAllowedContainer(el: Element | null, root: Element): Element | null {
  let current: Element | null = el;

  while (current && root.contains(current)) {
    const contentEditable = current.getAttribute("contenteditable");
    if (contentEditable?.toLowerCase() === "false") return null;
    if (current.matches(`${ALWAYS_ALLOWED_SELECTOR}, ${EDITABLE_SELECTOR}`)) return current;
    if (current === root) break;
    current = current.parentElement;
  }

  return null;
}

/** 取节点自身（元素）或其父元素。 */
function toElement(node: Node): Element | null {
  return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
}

/** 判断允许容器是否完整覆盖 Range，包括 selectNode(element) 的元素边界。 */
function containsRange(container: Element, range: Range): boolean {
  const containerRange = document.createRange();
  containerRange.selectNode(container);

  return (
    containerRange.compareBoundaryPoints(Range.START_TO_START, range) <= 0 &&
    containerRange.compareBoundaryPoints(Range.END_TO_END, range) >= 0
  );
}

/** selectNode(element) 会把 common ancestor 提升到父级，需从边界旁的节点找允许容器。 */
function findBoundaryAllowedContainer(range: Range, root: Element): Element | null {
  const boundaryCandidates: Node[] = [range.startContainer, range.endContainer];

  if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
    const startChild = range.startContainer.childNodes[range.startOffset];
    if (startChild) boundaryCandidates.push(startChild);
  }

  if (range.endContainer.nodeType === Node.ELEMENT_NODE && range.endOffset > 0) {
    const endChild = range.endContainer.childNodes[range.endOffset - 1];
    if (endChild) boundaryCandidates.push(endChild);
  }

  for (const node of boundaryCandidates) {
    const allowedContainer = findAllowedContainer(toElement(node), root);
    if (allowedContainer && containsRange(allowedContainer, range)) return allowedContainer;
  }

  return null;
}

/**
 * 博客正文复制边界：降低原创正文被直接选择、复制和右键提取的便利度。
 *
 * 实现：
 * - 正文区域应用 user-select: none（CSS class prose-guarded）
 * - 允许区域显式恢复 user-select: text：pre/code、链接、表单元素、[data-copy-allow]
 * - copy 事件（document 级）：验证 Selection/Range 是否触及受保护正文；
 *   只有整个 range 被同一个允许容器覆盖时才放行
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
   * - commonAncestor 在 root 内：检查 range 是否被同一个允许容器完整覆盖
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
        if (!findBoundaryAllowedContainer(range, root)) return true;
      } else if (commonElement.contains(root) && range.intersectsNode(root)) {
        if (!findBoundaryAllowedContainer(range, root)) return true;
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
        if (target && root.contains(target) && !findAllowedContainer(target, root)) {
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
      if (!root || !root.contains(target) || findAllowedContainer(target, root)) {
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
