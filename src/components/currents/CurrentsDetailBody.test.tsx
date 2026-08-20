// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CurrentsDetailBody } from "./CurrentsDetailBody";
import type { CurrentsItemDetail } from "@/lib/currents/types";
import * as readState from "@/lib/currents/readState";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  TransitionLink: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("./ScoreBadge", () => ({ ScoreBadge: () => <span>Score</span> }));
vi.mock("./FavoriteButton", () => ({ FavoriteButton: () => <button>Favorite</button> }));
vi.mock("./FeedbackForm", () => ({ FeedbackForm: () => <div>Feedback</div> }));

const mockItem: CurrentsItemDetail = {
  id: "item-1",
  title: "測試標題",
  summary: "測試摘要",
  reason: null,
  score: 85,
  scoreBreakdown: null,
  category: "models",
  sourceId: "source-1",
  author: null,
  publishedAt: "2025-01-15T10:00:00Z",
  tags: [],
  imageUrl: null,
  isFeatured: false,
  canonicalUrl: "https://example.com/article",
  alsoReportedBy: [],
  related: [],
  originalTitle: null,
  originalLanguage: null,
  deepRead: null,
};

const mockLabels = {
  back: "返回",
  readOriginal: "閱讀原文",
  aiSummary: "AI 導讀",
  whyWorth: "為什麼值得讀",
  deepRead: "深度解讀",
  deepReadPending: "深度解讀準備中",
  scoreBreakdown: "評分細節",
  related: "相關報導",
  tagsLabel: "標籤",
  otherSources: "其他來源",
  originalTitleLabel: "原標題",
  categoryLabels: { models: "模型" },
  translationTab: "原文翻譯",
  aiSummaryTab: "AI 導讀",
  deepReadTab: "深度解讀",
  translationPending: "翻譯準備中",
  feedback: {
    trigger: "反饋",
    title: "反饋問題",
    categoryLabel: "問題類型",
    categories: {
      content_error: "內容錯誤",
      translation_issue: "翻譯問題",
      broken_link: "失效連結",
      category_or_score: "分類或評分不當",
      other: "其他",
    },
    messageLabel: "補充說明",
    messagePlaceholder: "可簡單描述問題所在…",
    submit: "提交",
    submitting: "提交中…",
    success: "已收到，感謝反饋。",
    alreadyReported: "此類型已反饋過",
    errorRateLimit: "提交過於頻繁，請稍後再試。",
    errorNetwork: "網絡異常，請重試。",
    errorGeneric: "提交失敗，請稍後再試。",
    close: "收起",
  },
};

describe("CurrentsDetailBody prerendering behavior", () => {
  let markReadSpy: ReturnType<typeof vi.spyOn>;
  let prerenderingChangeListener: EventListener | null = null;

  beforeEach(() => {
    markReadSpy = vi.spyOn(readState, "markRead").mockImplementation(() => {});

    // 攔截 document 上的事件監聽器註冊（prerenderingchange 派發於 document）
    const originalAddEventListener = document.addEventListener.bind(document);
    vi.spyOn(document, "addEventListener").mockImplementation((type, listener, options) => {
      if (type === "prerenderingchange") {
        prerenderingChangeListener = listener as EventListener;
      }
      return originalAddEventListener(type, listener, options);
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    prerenderingChangeListener = null;
  });

  it("普通訪問時立即標記已讀", () => {
    Object.defineProperty(document, "prerendering", {
      configurable: true,
      get: () => false,
    });

    render(
      <CurrentsDetailBody
        item={mockItem}
        deepReadHtml={null}
        translationHtml={null}
        locale="zh"
        labels={mockLabels}
        sourceName="測試來源"
      />
    );

    expect(markReadSpy).toHaveBeenCalledWith("item-1");
    expect(markReadSpy).toHaveBeenCalledTimes(1);
  });

  it("預渲染狀態下不立即標記已讀", () => {
    Object.defineProperty(document, "prerendering", {
      configurable: true,
      get: () => true,
    });

    render(
      <CurrentsDetailBody
        item={mockItem}
        deepReadHtml={null}
        translationHtml={null}
        locale="zh"
        labels={mockLabels}
        sourceName="測試來源"
      />
    );

    expect(markReadSpy).not.toHaveBeenCalled();
  });

  it("預渲染激活後標記已讀", async () => {
    Object.defineProperty(document, "prerendering", {
      configurable: true,
      get: () => true,
    });

    render(
      <CurrentsDetailBody
        item={mockItem}
        deepReadHtml={null}
        translationHtml={null}
        locale="zh"
        labels={mockLabels}
        sourceName="測試來源"
      />
    );

    expect(markReadSpy).not.toHaveBeenCalled();
    expect(prerenderingChangeListener).not.toBeNull();

    // 模擬頁面激活
    Object.defineProperty(document, "prerendering", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("prerenderingchange"));
    // 二次派發驗證只寫入一次
    document.dispatchEvent(new Event("prerenderingchange"));

    await waitFor(() => {
      expect(markReadSpy).toHaveBeenCalledWith("item-1");
      expect(markReadSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("預渲染期間卸載後不會標記已讀", async () => {
    Object.defineProperty(document, "prerendering", {
      configurable: true,
      get: () => true,
    });

    const { unmount } = render(
      <CurrentsDetailBody
        item={mockItem}
        deepReadHtml={null}
        translationHtml={null}
        locale="zh"
        labels={mockLabels}
        sourceName="測試來源"
      />
    );

    expect(markReadSpy).not.toHaveBeenCalled();
    const capturedListener = prerenderingChangeListener;
    expect(capturedListener).not.toBeNull();

    // 卸載元件
    unmount();

    // 模擬頁面激活
    Object.defineProperty(document, "prerendering", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("prerenderingchange"));
    // 即使直接呼叫被卸載時捕獲的 listener 引用也不應寫入
    capturedListener?.call(document, new Event("prerenderingchange"));

    // 等待可能的非同步呼叫
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(markReadSpy).not.toHaveBeenCalled();
  });

  it("相同 item 不會重複標記", async () => {
    Object.defineProperty(document, "prerendering", {
      configurable: true,
      get: () => false,
    });

    const { rerender } = render(
      <CurrentsDetailBody
        item={mockItem}
        deepReadHtml={null}
        translationHtml={null}
        locale="zh"
        labels={mockLabels}
        sourceName="測試來源"
      />
    );

    expect(markReadSpy).toHaveBeenCalledWith("item-1");
    expect(markReadSpy).toHaveBeenCalledTimes(1);

    markReadSpy.mockClear();

    // 重渲染相同 item
    rerender(
      <CurrentsDetailBody
        item={mockItem}
        deepReadHtml={null}
        translationHtml={null}
        locale="zh"
        labels={mockLabels}
        sourceName="測試來源"
      />
    );

    expect(markReadSpy).not.toHaveBeenCalled();
  });
});
