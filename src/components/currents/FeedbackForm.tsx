"use client";

import { useRef, useState } from "react";
import {
  submitFeedback,
  FEEDBACK_CATEGORIES,
  CurrentsApiError,
  type CurrentsFeedbackCategory,
} from "@/lib/currents/api";
import {
  feedbackSubmittedKey,
  markFeedbackSubmittedKey,
  readFeedbackSubmittedKeys,
} from "@/lib/currents/feedback-state";

export interface FeedbackLabels {
  trigger: string;
  title: string;
  categoryLabel: string;
  categories: Record<CurrentsFeedbackCategory, string>;
  messageLabel: string;
  messagePlaceholder: string;
  submit: string;
  submitting: string;
  success: string;
  alreadyReported: string;
  errorGeneric: string;
  errorRateLimit: string;
  errorNetwork: string;
  close: string;
}

interface FeedbackFormProps {
  targetType: "item" | "event";
  targetId: string;
  locale: string;
  labels: FeedbackLabels;
}

type SubmitState = "idle" | "submitting" | "success" | "error-rate-limit" | "error-network" | "error-generic";

/**
 * 独立反馈入口（阶段 A）：资讯详情页与事件页正文末尾的低调文字按钮，
 * 点开为 inline 折叠面板；不打扰正常阅读，无遮罩、无弹窗。
 * 纯颜色过渡（无位移动画），reduced-motion 下无额外处理需求。
 */
export function FeedbackForm({ targetType, targetId, locale, labels }: FeedbackFormProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<CurrentsFeedbackCategory>("content_error");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  // 已提交类别集合只在打开面板时读取一次（客户端交互后才会用到，无水合分歧）
  const [submittedKeys, setSubmittedKeys] = useState<Set<string>>(new Set());
  const honeypotRef = useRef<HTMLInputElement>(null);

  const normalizedLocale: "zh" | "en" = locale === "zh" ? "zh" : "en";
  const storageKey = feedbackSubmittedKey(targetType, targetId, category);
  const panelId = `feedback-panel-${targetType}-${targetId}`;
  const statusId = `feedback-status-${targetType}-${targetId}`;
  const alreadyReported = submittedKeys.has(storageKey);

  const handleOpen = () => {
    setSubmittedKeys(readFeedbackSubmittedKeys(window.localStorage));
    setState("idle");
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setState("idle");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "submitting" || alreadyReported) return;

    // honeypot：bot 自动填表时带上，后端静默丢弃；正常用户永远为空
    const honeypot = honeypotRef.current?.value ?? "";

    setState("submitting");
    try {
      await submitFeedback({
        targetType,
        targetId,
        category,
        message: message.trim() || undefined,
        locale: normalizedLocale,
        ...(honeypot !== "" ? { website: honeypot } : {}),
      });
      markFeedbackSubmittedKey(window.localStorage, storageKey);
      setSubmittedKeys(readFeedbackSubmittedKeys(window.localStorage));
      setMessage("");
      setState("success");
    } catch (err: unknown) {
      if (err instanceof CurrentsApiError && err.status === 429) setState("error-rate-limit");
      else if (err instanceof CurrentsApiError && err.status === null) setState("error-network");
      else setState("error-generic");
    }
  };

  return (
    <div className="mt-12 border-t border-[var(--border)] pt-6">
      {!open ? (
        <button
          type="button"
          onClick={handleOpen}
          aria-expanded="false"
          aria-controls={panelId}
          className="inline-flex items-center gap-1.5 rounded-sm text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3.75h5.25m-7.5 6.53V6a2.25 2.25 0 012.25-2.25h10.5A2.25 2.25 0 0120.25 6v7.5a2.25 2.25 0 01-2.25 2.25H9.31a2.25 2.25 0 00-1.59.66l-2.28 2.28c-.47.47-1.28.14-1.28-.53z"
            />
          </svg>
          {labels.trigger}
        </button>
      ) : (
        <div id={panelId} className="max-w-lg">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{labels.title}</h2>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-sm text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
            >
              {labels.close}
            </button>
          </div>

          {state === "success" ? (
            <p id={statusId} className="text-sm text-[var(--text-secondary)]" role="status">
              {labels.success}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <fieldset>
                <legend className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
                  {labels.categoryLabel}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_CATEGORIES.map((cat) => (
                    <label
                      key={cat}
                      className={`cursor-pointer rounded-full border px-3 py-1.5 text-[13px] transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                        category === cat
                          ? "border-[var(--accent)] text-[var(--accent)]"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="feedback-category"
                        value={cat}
                        checked={category === cat}
                        onChange={() => {
                          setCategory(cat);
                          if (state !== "idle") setState("idle");
                        }}
                        className="sr-only"
                      />
                      {labels.categories[cat]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor={`feedback-message-${targetId}`} className="mb-2 block text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
                  {labels.messageLabel}
                </label>
                <textarea
                  id={`feedback-message-${targetId}`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={labels.messagePlaceholder}
                  maxLength={1000}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus-visible:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                />
                <p className="mt-1 text-right text-[11px] tabular-nums text-[var(--text-muted)]">{message.length}/1000</p>
              </div>

              {/* honeypot：视觉隐藏 + tabIndex -1，正常用户不可达 */}
              <input
                ref={honeypotRef}
                type="text"
                name="website"
                autoComplete="off"
                tabIndex={-1}
                aria-hidden="true"
                className="pointer-events-none absolute h-px w-px opacity-0"
                style={{ left: "-9999px" }}
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={state === "submitting" || alreadyReported}
                  aria-describedby={alreadyReported || state.startsWith("error-") ? statusId : undefined}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {state === "submitting" ? labels.submitting : labels.submit}
                </button>
                {alreadyReported && (
                  <span id={statusId} className="text-[13px] text-[var(--text-muted)]" role="status">{labels.alreadyReported}</span>
                )}
                {state === "error-rate-limit" && (
                  <span id={statusId} className="text-[13px] text-[var(--text-secondary)]" role="alert">{labels.errorRateLimit}</span>
                )}
                {state === "error-network" && (
                  <span id={statusId} className="text-[13px] text-[var(--text-secondary)]" role="alert">{labels.errorNetwork}</span>
                )}
                {state === "error-generic" && (
                  <span id={statusId} className="text-[13px] text-[var(--text-secondary)]" role="alert">{labels.errorGeneric}</span>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
