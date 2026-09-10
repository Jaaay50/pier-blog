"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { ThemedGradientText } from "@/components/ThemedGradientText";
import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/TurnstileWidget";
import { GuestbookTide } from "@/components/guestbook/GuestbookTide";
import { CurrentsApiError } from "@/lib/currents/api";
import { fmtDateTime } from "@/lib/currents/format-time";
import {
  fetchGuestbookEntries,
  GUESTBOOK_MESSAGE_MAX,
  guestbookMessageError,
  submitGuestbookEntry,
  type GuestbookEntry,
} from "@/lib/guestbook";

interface GuestbookBoardProps {
  locale: string;
  initialEntries: GuestbookEntry[];
  initialError?: boolean;
}

type SubmitState =
  | "idle"
  | "submitting"
  | "success"
  | "success-duplicate"
  | "error-rate-limit"
  | "error-network"
  | "error-verification"
  | "error-verification-unavailable"
  | "error-generic";

function formatRetry(seconds: number, locale: string): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return locale === "zh" ? `${minutes} 分钟` : `${minutes} min`;
}

function useTideMotion(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setEnabled(!motion.matches);
    apply();
    motion.addEventListener("change", apply);
    return () => motion.removeEventListener("change", apply);
  }, []);
  return enabled;
}

export function GuestbookBoard({ locale, initialEntries, initialError = false }: GuestbookBoardProps) {
  const t = useTranslations("guestbook");
  const normalizedLocale: "zh" | "en" = locale === "zh" ? "zh" : "en";
  const [entries, setEntries] = useState<GuestbookEntry[]>(initialEntries);
  const [loadError, setLoadError] = useState(initialError);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [validationError, setValidationError] = useState<"required" | "tooLong" | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const readCardRef = useRef<HTMLElement>(null);
  const pickButtonRef = useRef<HTMLButtonElement>(null);
  const tideEnabled = useTideMotion();

  const rateLimited = state === "error-rate-limit" && retryAfterSeconds !== null && retryAfterSeconds > 0;

  useEffect(() => {
    if (!rateLimited || retryAfterSeconds === null) return;
    const timer = window.setInterval(() => {
      setRetryAfterSeconds((value) => {
        if (value === null || value <= 1) {
          setState("idle");
          return null;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [rateLimited, retryAfterSeconds]);

  // 潮水模式下画布是纯指针交互，读卡是唯一的无障碍出口：
  // 打开时把焦点移进去（读屏才会念出这条留言），Esc 关闭并把焦点还回按钮。
  useEffect(() => {
    if (!tideEnabled || pickedId === null) return;
    readCardRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPickedId(null);
      pickButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [tideEnabled, pickedId]);

  const resetTurnstile = () => {
    setTurnstileToken("");
    turnstileRef.current?.reset();
  };

  const pickOne = () => {
    if (entries.length === 0) return;
    const next = entries[Math.floor(Math.random() * entries.length)];
    setPickedId(next.id);
    if (tideEnabled) return;
    const node = listRef.current?.querySelector(`[data-entry-id="${next.id}"]`);
    if (node && "scrollIntoView" in node && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const picked = entries.find((entry) => entry.id === pickedId) ?? null;
  // 潮水模式下列表是 sr-only，水面之下只剩加载失败提示，不该再撑出一段空白
  const showBelowWater = loadError || !tideEnabled;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current || state === "submitting" || turnstileToken === "" || rateLimited) return;
    const trimmed = message.trim();
    const invalid = guestbookMessageError(trimmed);
    if (invalid) {
      setValidationError(invalid);
      return;
    }
    setValidationError(null);
    const honeypot = honeypotRef.current?.value ?? "";
    submittingRef.current = true;
    setState("submitting");
    try {
      const result = await submitGuestbookEntry({
        message: trimmed,
        locale: normalizedLocale,
        turnstileToken,
        ...(honeypot !== "" ? { website: honeypot } : {}),
      });
      setMessage("");
      resetTurnstile();
      if (result.entry) {
        setEntries((current) =>
          current.some((entry) => entry.id === result.entry!.id)
            ? current
            : [result.entry!, ...current],
        );
        setPickedId(result.entry.id);
      }
      setLoadError(false);
      setState(result.duplicate ? "success-duplicate" : "success");
    } catch (err: unknown) {
      if (err instanceof CurrentsApiError && err.status === 429) {
        setRetryAfterSeconds(err.retryAfterSeconds ?? 600);
        setState("error-rate-limit");
      } else if (err instanceof CurrentsApiError && err.status === null) {
        setState("error-network");
      } else if (err instanceof CurrentsApiError && err.code === "human_verification_failed") {
        setState("error-verification");
      } else if (err instanceof CurrentsApiError && err.code === "verification_unavailable") {
        setState("error-verification-unavailable");
      } else {
        setState("error-generic");
      }
      resetTurnstile();
    } finally {
      submittingRef.current = false;
    }
  };

  const reload = async () => {
    try {
      const result = await fetchGuestbookEntries({ limit: 50 });
      setEntries(result.entries);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  };

  const list = (
    <ul
      ref={listRef}
      className={tideEnabled ? "sr-only" : "space-y-4"}
      aria-label={t("listLabel")}
      data-testid="guestbook-list"
    >
      {entries.map((entry) => {
        const active = entry.id === pickedId;
        return (
          <li
            key={entry.id}
            data-entry-id={entry.id}
            data-testid={`guestbook-entry-${entry.id}`}
            className={`rounded-2xl border px-5 py-4 transition-colors ${
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--border)] bg-[var(--bg-card)]"
            }`}
          >
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text-secondary)]">{entry.nickname}</span>
              <time dateTime={entry.createdAt}>{fmtDateTime(entry.createdAt, normalizedLocale)}</time>
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]">
              {entry.message}
            </p>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div>
      <div className="relative">
        <section className="guestbook-hero relative overflow-hidden border-y border-[var(--border)]">
          {tideEnabled && (
            <GuestbookTide
              entries={entries}
              selectedId={pickedId}
              onSelect={setPickedId}
              canvasLabel={t("canvasLabel")}
              className="absolute inset-0"
            />
          )}

          {/* 水雾：给标题一块可读的底，同时让水面有个远景 */}
          {tideEnabled && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-96 bg-gradient-to-b from-[var(--bg-primary)] via-[var(--bg-primary)]/60 to-transparent md:h-64" />
          )}

          {/* 标题浮在水面上；空白处的点击穿透到画布，只有控件可点 */}
          <div className="pointer-events-none relative z-10 flex h-full flex-col justify-between py-10 md:py-14">
            <div className="site-content w-full">
              <p className="text-sm font-medium text-[var(--text-muted)]">{t("label")}</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
                <ThemedGradientText>{t("title")}</ThemedGradientText>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
                {t("subtitle")}
              </p>
            </div>

            <div className="site-content mt-8 w-full">
              <div className="pointer-events-auto flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  ref={pickButtonRef}
                  onClick={pickOne}
                  disabled={entries.length === 0}
                  data-testid="guestbook-pick"
                  className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] bg-[var(--bg-primary)]/70 px-4 text-sm text-[var(--text-primary)] backdrop-blur-sm transition-colors hover:border-[var(--border-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("pick")}
                </button>
                <p className="text-sm text-[var(--text-muted)]" data-testid="guestbook-count">
                  {t("count", { count: entries.length })}
                </p>
              </div>
            </div>
          </div>

          {picked && tideEnabled && (
            <aside
              ref={readCardRef}
              tabIndex={-1}
              className="absolute inset-x-4 bottom-4 z-20 max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)]/95 p-5 shadow-[var(--shadow-card-hover)] backdrop-blur-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:inset-x-auto sm:left-6"
              data-testid="guestbook-read-card"
              role="region"
              aria-labelledby="guestbook-read-title"
            >
              <p id="guestbook-read-title" className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
                {t("letterTitle")}
              </p>
              <p className="mt-3 flex flex-wrap items-baseline gap-x-3 text-xs text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text-secondary)]">{picked.nickname}</span>
                <time dateTime={picked.createdAt}>{fmtDateTime(picked.createdAt, normalizedLocale)}</time>
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]">
                {picked.message}
              </p>
              <button
                type="button"
                className="mt-4 text-sm text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2"
                onClick={() => {
                  setPickedId(null);
                  pickButtonRef.current?.focus();
                }}
              >
                {t("closeCard")}
              </button>
            </aside>
          )}

          {tideEnabled && entries.length === 0 && !loadError && (
            <p className="pointer-events-none absolute inset-x-0 bottom-24 z-10 px-6 text-center text-sm text-[var(--text-muted)]">
              {t("empty")}
            </p>
          )}
        </section>

        {/* 表单：桌面浮在水面右下角并与内容列对齐，窄屏落回水面下方 */}
        <div className="motion-safe:lg:pointer-events-none motion-safe:lg:absolute motion-safe:lg:inset-0 motion-safe:lg:z-30 motion-safe:lg:flex motion-safe:lg:items-end">
          <div className="site-content w-full motion-safe:lg:pb-8">
            <form
              onSubmit={handleSubmit}
              className="pointer-events-auto relative mt-8 max-w-3xl space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 motion-safe:lg:ml-auto motion-safe:lg:mt-0 motion-safe:lg:w-[24rem] motion-safe:lg:bg-[var(--bg-card)]/90 motion-safe:lg:shadow-[var(--shadow-card-hover)] motion-safe:lg:backdrop-blur-md"
              data-testid="guestbook-form"
            >
        <label htmlFor="guestbook-message" className="block text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
          {t("messageLabel")}
        </label>
        <textarea
          id="guestbook-message"
          data-testid="guestbook-message"
          value={message}
          maxLength={GUESTBOOK_MESSAGE_MAX}
          rows={4}
          disabled={state === "submitting" || rateLimited}
          placeholder={t("messagePlaceholder")}
          aria-invalid={validationError !== null}
          aria-describedby={validationError ? "guestbook-validation" : undefined}
          onChange={(event) => {
            setMessage(event.target.value);
            if (validationError) setValidationError(null);
            if (state === "success" || state === "success-duplicate") setState("idle");
          }}
          className="w-full resize-y rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        />
        <p className="text-right font-mono text-xs text-[var(--text-muted)]">
          {message.trim().length}/{GUESTBOOK_MESSAGE_MAX}
        </p>
        {validationError && (
          <p id="guestbook-validation" className="text-sm text-[var(--text-secondary)]" role="alert">
            {validationError === "tooLong" ? t("messageTooLong") : t("messageRequired")}
          </p>
        )}
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
        <TurnstileWidget
          ref={turnstileRef}
          action="guestbook_submit"
          onToken={(token) => {
            setTurnstileToken(token);
            if (!submittingRef.current && state.startsWith("error-verification")) setState("idle");
          }}
          onExpired={resetTurnstile}
          onError={() => {
            setTurnstileToken("");
            if (!submittingRef.current) setState("error-verification-unavailable");
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            data-testid="guestbook-submit"
            disabled={state === "submitting" || turnstileToken === "" || rateLimited}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state === "submitting" ? t("submitting") : t("submit")}
          </button>
          {(state === "success" || state === "success-duplicate") && (
            <span role="status" className="text-sm text-[var(--text-primary)]">
              {state === "success-duplicate" ? t("successDuplicate") : t("success")}
            </span>
          )}
          {state === "error-rate-limit" && (
            <span role="status" className="text-sm text-[var(--text-secondary)]" data-testid="guestbook-rate-limit">
              {t("errorRateLimit", {
                wait: formatRetry(retryAfterSeconds ?? 600, normalizedLocale),
              })}
            </span>
          )}
          {(state === "error-network" ||
            state === "error-verification" ||
            state === "error-verification-unavailable" ||
            state === "error-generic") && (
            <span role="alert" className="text-sm text-[var(--text-secondary)]">
              {state === "error-network"
                ? t("errorNetwork")
                : state === "error-verification"
                  ? t("errorVerification")
                  : state === "error-verification-unavailable"
                    ? t("errorVerificationUnavailable")
                    : t("errorGeneric")}
            </span>
          )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 水面之下：潮水模式时列表是 sr-only，这里不该再撑出一段空白 */}
      <div className={showBelowWater ? "site-content pb-16 pt-10" : "site-content"}>
        {loadError && (
          <div className="mb-8 rounded-xl border border-[var(--border)] px-5 py-4 text-sm" role="alert">
            <p>{t("loadError")}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="mt-2 text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {t("retry")}
            </button>
          </div>
        )}

        {entries.length === 0 && !loadError && !tideEnabled ? (
          <p className="text-sm text-[var(--text-muted)]" data-testid="guestbook-empty">
            {t("empty")}
          </p>
        ) : (
          entries.length > 0 && list
        )}
      </div>
    </div>
  );
}
