"use client";

import { useEffect, useRef, useState } from "react";
import {
  submitSiteFeedback,
  sanitizeFeedbackPagePath,
  SITE_FEEDBACK_CATEGORIES,
  CurrentsApiError,
  type SiteFeedbackCategory,
} from "@/lib/currents/api";
import {
  siteFeedbackSubmittedKey,
  markFeedbackSubmittedKey,
  readFeedbackSubmittedKeys,
} from "@/lib/currents/feedback-state";

export interface SiteFeedbackLabels {
  categoryLabel: string;
  categories: Record<SiteFeedbackCategory, string>;
  messageLabel: string;
  messagePlaceholder: string;
  messageRequired: string;
  submit: string;
  submitting: string;
  success: string;
  successDuplicate: string;
  alreadyReported: string;
  errorRateLimit: string;
  errorNetwork: string;
  errorGeneric: string;
}

interface SiteFeedbackFormProps {
  locale: string;
  /** 预选分类（如从 Agent 接入页跳入时传 "agent_access"） */
  initialCategory?: SiteFeedbackCategory;
  labels: SiteFeedbackLabels;
}

type SubmitState =
  | "idle"
  | "submitting"
  | "success"
  | "success-duplicate"
  | "error-rate-limit"
  | "error-network"
  | "error-generic";

function isSiteFeedbackCategory(value: string | undefined): value is SiteFeedbackCategory {
  return (
    typeof value === "string" &&
    (SITE_FEEDBACK_CATEGORIES as readonly string[]).includes(value)
  );
}

/**
 * 全局产品反馈表单（阶段 C）：/feedback 页面主体。
 * 与详情页内容纠错（FeedbackForm）共享后端端点与防护语义，
 * 但表单结构独立演化——两者只共享 api/feedback-state 基础能力。
 */
export function SiteFeedbackForm({ locale, initialCategory, labels }: SiteFeedbackFormProps) {
  const [category, setCategory] = useState<SiteFeedbackCategory>(
    isSiteFeedbackCategory(initialCategory) ? initialCategory : "product_bug",
  );

  // 预选分类：页面保持静态生成，?category= 由客户端水合后读取并应用。
  // 宏任务触发，避免在 effect 中同步 setState 造成级联渲染。
  useEffect(() => {
    const timer = setTimeout(() => {
      const param = new URLSearchParams(window.location.search).get("category") ?? undefined;
      if (isSiteFeedbackCategory(param)) setCategory(param);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [validationError, setValidationError] = useState(false);
  const [submittedKeys, setSubmittedKeys] = useState<Set<string>>(new Set());
  const honeypotRef = useRef<HTMLInputElement>(null);

  const normalizedLocale: "zh" | "en" = locale === "zh" ? "zh" : "en";
  const storageKey = siteFeedbackSubmittedKey(category);
  const alreadyReported = submittedKeys.has(storageKey);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "submitting" || alreadyReported) return;

    const trimmed = message.trim();
    if (trimmed.length < 4) {
      setValidationError(true);
      return;
    }
    setValidationError(false);

    // 入口来源页面：仅保留路径，剥掉 query/hash/任何潜在敏感参数。
    // 注意：这是入口上下文而非用户描述的对象页面，随提交自动附带。
    const pagePath = sanitizeFeedbackPagePath(
      typeof window !== "undefined" ? window.location.pathname : undefined,
    );
    const honeypot = honeypotRef.current?.value ?? "";

    setState("submitting");
    try {
      const result = await submitSiteFeedback({
        category,
        message: trimmed,
        locale: normalizedLocale,
        ...(pagePath ? { pagePath } : {}),
        ...(honeypot !== "" ? { website: honeypot } : {}),
      });
      markFeedbackSubmittedKey(window.localStorage, storageKey);
      setSubmittedKeys(readFeedbackSubmittedKeys(window.localStorage));
      setMessage("");
      setState(result.duplicate ? "success-duplicate" : "success");
    } catch (err: unknown) {
      if (err instanceof CurrentsApiError && err.status === 429) setState("error-rate-limit");
      else if (err instanceof CurrentsApiError && err.status === null) setState("error-network");
      else setState("error-generic");
    }
  };

  const succeeded = state === "success" || state === "success-duplicate";

  return (
    <div className="max-w-xl">
      {succeeded ? (
        <div
          role="status"
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-5 py-4 text-sm text-[var(--text-primary)]"
        >
          {state === "success-duplicate" ? labels.successDuplicate : labels.success}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          onFocusCapture={() => {
            // 首次聚焦时读一次本地已提交记录（客户端交互后才有意义，无水合分歧）
            if (submittedKeys.size === 0 && typeof window !== "undefined") {
              setSubmittedKeys(readFeedbackSubmittedKeys(window.localStorage));
            }
          }}
        >
          <fieldset>
            <legend className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
              {labels.categoryLabel}
            </legend>
            <div className="flex flex-wrap gap-2">
              {SITE_FEEDBACK_CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                    category === cat
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="site-feedback-category"
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
            <label
              htmlFor="site-feedback-message"
              className="mb-2 block text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]"
            >
              {labels.messageLabel}
            </label>
            <textarea
              id="site-feedback-message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (validationError) setValidationError(false);
              }}
              placeholder={labels.messagePlaceholder}
              maxLength={1000}
              rows={5}
              aria-invalid={validationError}
              aria-describedby={validationError ? "site-feedback-validation" : undefined}
              className="w-full resize-y rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus-visible:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            />
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <p
                className="min-h-[1em] text-[12px] text-[var(--text-secondary)]"
                role={validationError ? "alert" : undefined}
              >
                {validationError && (
                  <span id="site-feedback-validation">{labels.messageRequired}</span>
                )}
              </p>
              <p className="shrink-0 text-right text-[11px] tabular-nums text-[var(--text-muted)]">
                {message.length}/1000
              </p>
            </div>
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
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state === "submitting" ? labels.submitting : labels.submit}
            </button>
            {alreadyReported && (
              <span className="text-[13px] text-[var(--text-muted)]" role="status">
                {labels.alreadyReported}
              </span>
            )}
            {(state === "error-rate-limit" ||
              state === "error-network" ||
              state === "error-generic") && (
              <span className="text-[13px] text-[var(--text-secondary)]" role="alert">
                {state === "error-rate-limit"
                  ? labels.errorRateLimit
                  : state === "error-network"
                    ? labels.errorNetwork
                    : labels.errorGeneric}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
