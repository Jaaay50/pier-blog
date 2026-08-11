"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * Agent 接入页复制能力（零依赖，复用 CodeBlockWrapper 的交互语言）：
 * - CopyBlock：带复制按钮的代码块，按钮常驻可见（不依赖 hover），
 *   键盘可达，复制成功后按钮短暂显示「已复制」。
 * - CopyChip：示例提问卡片，整张卡片即按钮，点击/回车复制文本。
 */
type CopyStatus = "idle" | "copied" | "failed";

function selectFallback(target: HTMLElement | null) {
  if (!target) return;
  const range = document.createRange();
  range.selectNodeContents(target);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function legacyCopy(text: string) {
  if (typeof document.execCommand !== "function") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.readOnly = true;
  textarea.tabIndex = -1;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

function useCopy() {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timer = useRef<number | null>(null);
  const requestId = useRef(0);

  useEffect(
    () => () => {
      requestId.current += 1;
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async (text: string, fallbackTarget: HTMLElement | null) => {
    const currentRequest = ++requestId.current;
    if (timer.current !== null) window.clearTimeout(timer.current);

    let copied = false;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard-unavailable");
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = legacyCopy(text);
      if (!copied) selectFallback(fallbackTarget);
    }

    // 只允许最后一次点击更新状态，避免较慢的旧请求覆盖较新的复制结果。
    if (currentRequest !== requestId.current) return;
    setStatus(copied ? "copied" : "failed");
    timer.current = window.setTimeout(() => setStatus("idle"), copied ? 1600 : 3000);
  }, []);

  return { status, copy };
}

export function AgentCopyBlock({
  text,
  label,
  copyLabel,
  copiedLabel,
  copyFailedLabel,
  children,
}: {
  text: string;
  label?: string;
  copyLabel: string;
  copiedLabel: string;
  copyFailedLabel: string;
  children: React.ReactNode;
}) {
  const { status, copy } = useCopy();
  const rootRef = useRef<HTMLElement>(null);
  const statusId = useId();
  const statusLabel =
    status === "copied" ? copiedLabel : status === "failed" ? copyFailedLabel : copyLabel;

  return (
    <figure ref={rootRef} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
      <figcaption className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2">
        {label ? (
          <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
            {label}
          </span>
        ) : (
          <span aria-hidden />
        )}
        <button
          type="button"
          onClick={() => copy(text, rootRef.current?.querySelector("code") ?? rootRef.current)}
          aria-label={statusLabel}
          className="shrink-0 rounded-md border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {statusLabel}
        </button>
      </figcaption>
      {children}
      <span id={statusId} role="status" aria-live="polite" className="sr-only">
        {status === "idle" ? "" : statusLabel}
      </span>
    </figure>
  );
}

export function AgentCopyChip({
  text,
  copyLabel,
  copiedLabel,
  copyFailedLabel,
}: {
  text: string;
  copyLabel: string;
  copiedLabel: string;
  copyFailedLabel: string;
}) {
  const { status, copy } = useCopy();
  const textRef = useRef<HTMLSpanElement>(null);
  const statusId = useId();
  const statusLabel =
    status === "copied" ? copiedLabel : status === "failed" ? copyFailedLabel : copyLabel;

  return (
    <>
      <button
        type="button"
        onClick={() => copy(text, textRef.current)}
        aria-label={`${statusLabel}: ${text}`}
        className="flex w-full items-start justify-between gap-3 rounded-lg border border-[var(--border)] px-4 py-3 text-left text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--border-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <span ref={textRef} className="min-w-0">{text}</span>
        <span
          aria-hidden
          className={`shrink-0 pt-0.5 text-[11px] font-medium ${
            status === "copied" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
          }`}
        >
          {statusLabel}
        </span>
      </button>
      <span id={statusId} role="status" aria-live="polite" className="sr-only">
        {status === "idle" ? "" : statusLabel}
      </span>
    </>
  );
}
