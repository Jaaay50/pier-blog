"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { fetchItemDetail } from "@/lib/currents/api";
import type { CurrentsItemDetail } from "@/lib/currents/types";
import { ScoreBadge } from "./ScoreBadge";
import { FavoriteButton } from "./FavoriteButton";

interface CurrentsReaderProps {
  itemId: string;
  onClose: () => void;
}

type DetailState =
  | { status: "loading"; item: null }
  | { status: "error"; item: null }
  | { status: "ok"; item: CurrentsItemDetail };

type DetailAction =
  | { type: "reset" }
  | { type: "ok"; item: CurrentsItemDetail }
  | { type: "error" };

function detailReducer(state: DetailState, action: DetailAction): DetailState {
  switch (action.type) {
    case "reset":
      return state.status === "loading" ? state : { status: "loading", item: null };
    case "ok":
      return { status: "ok", item: action.item };
    case "error":
      return { status: "error", item: null };
  }
}

/** 轻量 markdown → HTML（复用项目已有 unified 管线，渲染进 prose 容器） */
async function renderMarkdown(md: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(md);
  return String(file);
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 阅读层：fixed overlay + 详情数据岛。
 * - Esc 关闭、焦点管理（打开时聚焦面板、焦点圈、关闭时还原）
 * - deepRead 为 Markdown 时渲染；为空/生成中时显示提示
 * - 多信源列表 + 原文链接
 */
export function CurrentsReader({ itemId, onClose }: CurrentsReaderProps) {
  const t = useTranslations("currents");
  const locale = useLocale();
  const [state, dispatch] = useReducer(detailReducer, {
    status: "loading",
    item: null,
  });
  const [retryCount, setRetryCount] = useState(0);
  const [html, setHtml] = useState<string | null>(null);
  const [prevKey, setPrevKey] = useState(`${itemId}|${locale}|${retryCount}`);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // item/locale/retry 变化时渲染期重置（避免 effect 内同步 setState）
  const requestKey = `${itemId}|${locale}|${retryCount}`;
  if (prevKey !== requestKey) {
    setPrevKey(requestKey);
    dispatch({ type: "reset" });
    setHtml(null);
  }

  // 记录打开前焦点，关闭时还原
  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    return () => {
      restoreFocusRef.current?.focus?.();
    };
  }, []);

  // 锁定背景滚动
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // 数据加载
  useEffect(() => {
    const controller = new AbortController();
    fetchItemDetail(itemId, locale, controller.signal)
      .then(async (item) => {
        if (controller.signal.aborted) return;
        dispatch({ type: "ok", item });
        if (item.deepRead) {
          try {
            const rendered = await renderMarkdown(item.deepRead);
            if (!controller.signal.aborted) setHtml(rendered);
          } catch {
            /* markdown 渲染失败时保留纯文本回退 */
          }
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        dispatch({ type: "error" });
      });
    return () => controller.abort();
  }, [itemId, locale, retryCount]);

  // Esc 关闭 + 初始聚焦 + 简易焦点圈
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables =
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const item = state.item;
  const sources = useMemo(
    () => (item?.alsoReportedBy ?? []).filter((s) => s.source_url || s.source_name),
    [item],
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 遮罩 */}
      <div
        aria-hidden
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={item?.title ?? t("deepRead")}
        tabIndex={-1}
        className="card-glass relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl outline-none sm:rounded-2xl"
      >
        {/* 头部 */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-4">
          <div className="min-w-0 flex-1">
            {item ? (
              <>
                <h2 className="text-lg font-semibold leading-snug tracking-tight">
                  {item.title}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                  <ScoreBadge score={item.score} />
                  {item.publishedAt && (
                    <time dateTime={item.publishedAt}>
                      {new Date(item.publishedAt).toLocaleString(
                        locale === "zh" ? "zh-CN" : "en-US",
                        { dateStyle: "medium", timeStyle: "short" },
                      )}
                    </time>
                  )}
                  {item.originalTitle && item.originalTitle !== item.title && (
                    <span className="line-clamp-1 opacity-70">{item.originalTitle}</span>
                  )}
                </div>
              </>
            ) : (
              <div className="skeleton-block h-5 w-2/3 rounded" />
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {item && <FavoriteButton itemId={item.id} />}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="inline-flex items-center justify-center rounded-full p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {state.status === "loading" && (
            <div aria-hidden className="space-y-3 py-2">
              <div className="skeleton-block h-4 w-full rounded" />
              <div className="skeleton-block h-4 w-11/12 rounded" />
              <div className="skeleton-block h-4 w-4/5 rounded" />
              <div className="skeleton-block h-4 w-full rounded" />
              <div className="skeleton-block h-4 w-2/3 rounded" />
            </div>
          )}

          {state.status === "error" && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-[var(--text-muted)]">{t("errorLoad")}</p>
              <button
                type="button"
                onClick={() => setRetryCount((c) => c + 1)}
                className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
              >
                {t("retry")}
              </button>
            </div>
          )}

          {item && (
            <>
              {/* 摘要 */}
              {item.summary && (
                <p className="mb-6 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {item.summary}
                </p>
              )}

              {/* 深度解读 */}
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                {t("deepRead")}
              </h3>
              {item.deepRead ? (
                html ? (
                  <div
                    className="prose currents-reader-prose mb-8 max-w-none"
                    // deepRead 由受信任的后台 LLM 管线产出并经 rehype 序列化
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                ) : (
                  <p className="mb-8 whitespace-pre-wrap text-sm leading-relaxed">
                    {item.deepRead}
                  </p>
                )
              ) : (
                <p className="mb-8 rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
                  {t("deepReadPending")}
                </p>
              )}

              {/* 多信源 */}
              {sources.length > 1 && (
                <div className="mb-8">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                    {t("otherSources")}
                  </h3>
                  <ul className="space-y-2">
                    {sources.map((s) => (
                      <li key={`${s.source_id}-${s.source_url}`} className="text-sm">
                        {s.source_url ? (
                          <a
                            href={s.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
                          >
                            {s.source_name ?? s.source_id}
                            {s.source_title ? ` — ${s.source_title}` : ""}
                          </a>
                        ) : (
                          <span className="text-[var(--text-secondary)]">
                            {s.source_name ?? s.source_id}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 原文链接 */}
              {item.canonicalUrl && (
                <a
                  href={item.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                >
                  {t("readOriginal")}
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M7 17L17 7M7 7h10v10" />
                  </svg>
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
