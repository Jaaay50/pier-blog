"use client";

import { useCallback, useRef, useState } from "react";

/**
 * 代码块复制按钮：绝对定位右上角，hover 代码块时浮现。
 * 通过 MDX components 映射注入 pre 的 wrapper，不把整棵 MDX 树变 client。
 * pre 本身仍是服务端渲染产物，本组件只包一层 relative 容器 + 按钮。
 */
export function CodeBlockWrapper({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const onCopy = useCallback(async () => {
    const code = rootRef.current?.querySelector("code");
    const text = code?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard API 失败（非安全上下文等）：退化为选中原件
      const range = document.createRange();
      if (code) {
        range.selectNodeContents(code);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, []);

  return (
    <div ref={rootRef} className="codeblock-wrapper group/codeblock relative">
      {children}
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-primary)]/80 text-[var(--text-muted)] opacity-0 backdrop-blur-sm transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] focus-visible:opacity-100 group-hover/codeblock:opacity-100"
      >
        {copied ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </div>
  );
}
