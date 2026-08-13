// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModelsLeaderboardClient } from "./ModelsLeaderboardClient";
import type { ModelsLeaderboardResponse, ModelsLeaderboardRow } from "@/lib/currents/models-types";

const mockFetchLeaderboard = vi.fn();

vi.mock("@/lib/currents/api", () => ({
  fetchModelsLeaderboard: (...args: unknown[]) => mockFetchLeaderboard(...args),
}));

vi.mock("@/components/TransitionLink", () => ({
  TransitionLink: ({ href, children, ...props }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const messages = {
  currents: {
    modelsCatLabel: "榜单类别",
    modelsCatOverall: "综合",
    modelsCatCoding: "编程",
    modelsCatAgent: "Agent",
    modelsCatReasoning: "推理",
    modelsCatValue: "性价比",
    modelsViewLabel: "模型范围",
    modelsViewReleased: "正式发布",
    modelsViewPreview: "Preview",
    modelsColRank: "排名",
    modelsColModel: "模型",
    modelsColAbility: "能力分",
    modelsColValueScore: "性价比分",
    modelsColConfidence: "可信度",
    modelsColPrice: "价格（入/出）",
    modelsColDelta: "变化",
    modelsAbilityShort: "能力",
    modelsConfHigh: "高",
    modelsConfMedium: "中",
    modelsConfLow: "低",
    modelsConfTooltip: "可信度说明",
    modelsPriceUnit: "美元 / 每百万 token",
    modelsPriceSubscription: "订阅制",
    modelsPriceLocal: "本地部署",
    modelsPriceUnavailable: "未挂牌",
    modelsDeltaNone: "首次收录，暂无排名变化",
    modelsDeltaFlat: "排名不变",
    modelsDeltaUp: "上升 {count} 位",
    modelsDeltaDown: "下降 {count} 位",
    modelsStale: "数据陈旧",
    modelsStaleTooltip: "来源陈旧：{sources}",
    modelsStaleSourcesNote: "{count} 个来源数据陈旧",
    modelsComputedAt: "数据更新于 {time}",
    modelsMainBoard: "主榜",
    modelsObserving: "观察中",
    modelsObservingNote: "覆盖不足说明",
    modelsEmptyPreparing: "榜单数据准备中，稍后再来。",
    modelsEmptyView: "当前视图暂无模型。",
    modelsFooterNote: "底部说明",
    modelsMethodologyLink: "评分方法与数据来源",
    errorLoad: "加载失败",
    retry: "重试",
    loading: "加载中…",
    loadMoreError: "加载更多失败",
  },
};

function row(overrides: Partial<ModelsLeaderboardRow> & { slug: string; name: string }): ModelsLeaderboardRow {
  const { slug, name, ...rest } = overrides;
  return {
    rank: 1,
    prevRank: null,
    model: { slug, name, vendor: "Vendor", vendorId: "vendor", status: "released", releaseDate: "2026-07-01" },
    abilityScore: 90.5,
    confidence: 0.9,
    confidenceParts: { coverage: 1, freshness: 0.9, agreement: 0.8, identity: 1 },
    valueScore: null,
    coverageCount: 3,
    staleSources: [],
    price: { kind: "payg", inputUsdPerMtok: 5, outputUsdPerMtok: 25, sourceUrl: null, verifiedAt: null, notes: null },
    computedAt: "2026-08-13T10:00:00.000Z",
    ...rest,
  };
}

function response(overrides: Partial<ModelsLeaderboardResponse> = {}): ModelsLeaderboardResponse {
  return {
    schemaVersion: 1,
    category: "overall",
    view: "released",
    items: [
      row({ slug: "claude-opus-5", name: "Claude Opus 5", rank: 1, prevRank: 2 }),
      row({
        slug: "gpt-5-5",
        name: "GPT-5.5",
        rank: 2,
        prevRank: 1,
        confidence: 0.6,
        price: { kind: "unavailable", inputUsdPerMtok: null, outputUsdPerMtok: null, sourceUrl: null, verifiedAt: null, notes: null },
      }),
      row({ slug: "kimi-k3", name: "Kimi K3", rank: 3, prevRank: null, confidence: 0.4 }),
    ],
    observing: [row({ slug: "glm-5-2", name: "GLM-5.2", rank: 1, coverageCount: 1 })],
    meta: {
      scoringVersion: "mlv1",
      computedAt: "2026-08-13T10:00:00.000Z",
      empty: false,
      mainCount: 3,
      observingCount: 1,
      sources: [],
      generatedAt: "2026-08-13T10:00:00.000Z",
    },
    ...overrides,
  };
}

function renderClient() {
  return render(
    <NextIntlClientProvider locale="zh" messages={messages}>
      <ModelsLeaderboardClient />
    </NextIntlClientProvider>,
  );
}

describe("ModelsLeaderboardClient", () => {
  beforeEach(() => {
    mockFetchLeaderboard.mockReset();
  });
  afterEach(() => cleanup());

  it("渲染主榜表格：排名/模型/能力分/可信度/价格/变化分离呈现", async () => {
    mockFetchLeaderboard.mockResolvedValue(response());
    renderClient();
    await waitFor(() => expect(screen.getAllByText("Claude Opus 5").length).toBeGreaterThanOrEqual(1));

    // 语义化表格
    const tables = screen.getAllByRole("table");
    expect(tables.length).toBeGreaterThanOrEqual(1);
    // 能力分与价格分离（价格不混入能力）
    expect(screen.getAllByText("90.5").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$5 / $25").length).toBeGreaterThanOrEqual(1);
    // 价格缺失显示未挂牌
    expect(screen.getAllByText("未挂牌").length).toBeGreaterThanOrEqual(1);
    // 可信度分档
    expect(screen.getAllByText(/高 0\.90/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/低 0\.40/).length).toBeGreaterThanOrEqual(1);
    // 排名变化：↑ ↓ 与首次 —
    expect(screen.getAllByLabelText("上升 1 位")[0].textContent).toContain("↑");
    expect(screen.getAllByLabelText("下降 1 位")[0].textContent).toContain("↓");
    expect(screen.getAllByLabelText("首次收录，暂无排名变化").length).toBeGreaterThanOrEqual(1);
    // 观察中分组
    expect(screen.getByText("观察中")).toBeTruthy();
    expect(screen.getAllByText("GLM-5.2").length).toBeGreaterThanOrEqual(1);
    // 数据时间
    expect(screen.getByText(/数据更新于/)).toBeTruthy();
  });

  it("五类 tab 切换触发对应 category 请求", async () => {
    mockFetchLeaderboard.mockResolvedValue(response());
    renderClient();
    await waitFor(() => expect(mockFetchLeaderboard).toHaveBeenCalled());
    expect(mockFetchLeaderboard).toHaveBeenLastCalledWith("overall", "released", expect.anything());

    for (const [label, cat] of [
      ["编程", "coding"],
      ["Agent", "agent"],
      ["推理", "reasoning"],
      ["性价比", "value"],
    ] as const) {
      fireEvent.click(screen.getByRole("tab", { name: label }));
      await waitFor(() => expect(mockFetchLeaderboard).toHaveBeenLastCalledWith(cat, "released", expect.anything()));
    }
    // tab aria-selected 状态
    expect(screen.getByRole("tab", { name: "性价比" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "综合" }).getAttribute("aria-selected")).toBe("false");
  });

  it("正式/Preview 视图切换触发对应 view 请求", async () => {
    mockFetchLeaderboard.mockResolvedValue(response());
    renderClient();
    await waitFor(() => expect(mockFetchLeaderboard).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
    await waitFor(() => expect(mockFetchLeaderboard).toHaveBeenLastCalledWith("overall", "preview", expect.anything()));
  });

  it("重复点击当前 tab 不进入永久 loading，也不重复请求", async () => {
    mockFetchLeaderboard.mockResolvedValue(response());
    renderClient();
    await screen.findAllByText("Claude Opus 5");
    const calls = mockFetchLeaderboard.mock.calls.length;
    fireEvent.click(screen.getByRole("tab", { name: "综合" }));
    fireEvent.click(screen.getByRole("tab", { name: "正式发布" }));
    expect(mockFetchLeaderboard).toHaveBeenCalledTimes(calls);
    expect(screen.getAllByText("Claude Opus 5").length).toBeGreaterThanOrEqual(1);
  });

  it("tabs 使用 roving tabindex、tabpanel 关联与方向键/Home/End 操作", async () => {
    mockFetchLeaderboard.mockImplementation(async (category: string, view: string) => response({ category, view } as Partial<ModelsLeaderboardResponse>));
    renderClient();
    await screen.findAllByText("Claude Opus 5");
    const overall = screen.getByRole("tab", { name: "综合" });
    const coding = screen.getByRole("tab", { name: "编程" });
    expect(overall.tabIndex).toBe(0);
    expect(coding.tabIndex).toBe(-1);
    const panel = screen.getByRole("tabpanel");
    expect(overall.getAttribute("aria-controls")).toBe(panel.id);

    fireEvent.keyDown(overall, { key: "ArrowRight" });
    await waitFor(() => expect(coding.getAttribute("aria-selected")).toBe("true"));
    expect(document.activeElement).toBe(coding);
    fireEvent.keyDown(coding, { key: "End" });
    await waitFor(() => expect(screen.getByRole("tab", { name: "性价比" }).getAttribute("aria-selected")).toBe("true"));

    const released = screen.getByRole("tab", { name: "正式发布" });
    fireEvent.keyDown(released, { key: "ArrowLeft" });
    await waitFor(() => expect(screen.getByRole("tab", { name: "Preview" }).getAttribute("aria-selected")).toBe("true"));
  });

  it("value 榜显示性价比分列", async () => {
    mockFetchLeaderboard.mockResolvedValue(
      response({
        category: "value",
        items: [row({ slug: "gpt-5-6-luna", name: "GPT-5.6 Luna", valueScore: 65.9, abilityScore: 46.5 })],
        observing: [],
      }),
    );
    renderClient();
    fireEvent.click(await screen.findByRole("tab", { name: "性价比" }));
    await waitFor(() => expect(screen.getAllByText("65.9").length).toBeGreaterThanOrEqual(1));
    expect(screen.getAllByText(/能力 46\.5/).length).toBeGreaterThanOrEqual(1);
  });

  it("加载失败显示可重试错误态，重试成功恢复", async () => {
    mockFetchLeaderboard.mockRejectedValueOnce(new Error("network"));
    mockFetchLeaderboard.mockResolvedValueOnce(response());
    renderClient();
    const retry = await screen.findByRole("button", { name: "重试" });
    fireEvent.click(retry);
    await waitFor(() => expect(screen.getAllByText("Claude Opus 5").length).toBeGreaterThanOrEqual(1));
  });

  it("初始加载骨架向辅助技术暴露状态", () => {
    mockFetchLeaderboard.mockReturnValue(new Promise(() => undefined));
    renderClient();
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("加载中…")).toBeTruthy();
  });

  it("空数据显示准备中空态", async () => {
    mockFetchLeaderboard.mockResolvedValue(
      response({ items: [], observing: [], meta: { ...response().meta, empty: true, mainCount: 0, observingCount: 0 } }),
    );
    renderClient();
    await waitFor(() => expect(screen.getByText("榜单数据准备中，稍后再来。")).toBeTruthy());
  });

  it("来源陈旧提示与 Preview 徽章", async () => {
    mockFetchLeaderboard.mockResolvedValue(
      response({
        items: [
          row({ slug: "hy3", name: "Hunyuan Hy3", staleSources: ["livebench"], model: { slug: "hy3", name: "Hunyuan Hy3", vendor: "Tencent", vendorId: "tencent", status: "preview", releaseDate: null } }),
        ],
        observing: [],
        meta: {
          ...response().meta,
          sources: [
            {
              id: "livebench",
              name: "LiveBench",
              operatorId: "abacus-livebench",
              operatorName: "LiveBench",
              url: "https://livebench.ai",
              method: "csv",
              license: "public",
              categories: ["overall"],
              cadenceDays: 45,
              stalenessDays: 120,
              lastSuccessAt: "2026-01-01T00:00:00.000Z",
              lastStatus: "ok",
              stale: true,
            },
          ],
        },
      }),
    );
    renderClient();
    await waitFor(() => expect(screen.getAllByText("Hunyuan Hy3").length).toBeGreaterThanOrEqual(1));
    // 行内 Preview 徽章（span）与视图 tab（button）共存，按元素类型区分
    const previewBadges = screen.getAllByText("Preview").filter((el) => el.tagName === "SPAN");
    expect(previewBadges.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1 个来源数据陈旧")).toBeTruthy();
    expect(screen.getAllByText("数据陈旧").length).toBeGreaterThanOrEqual(1);
    expect(document.querySelector('[data-mobile-stale="hy3"]')).not.toBeNull();
  });

  it("切换后的 loading/error 不展示上一榜的更新时间与 stale 元数据", async () => {
    const staleSource = {
      id: "livebench", name: "LiveBench", operatorId: "x", operatorName: "x", url: "https://livebench.ai",
      method: "csv", license: "public", categories: ["overall"], cadenceDays: 7, stalenessDays: 30,
      lastSuccessAt: null, lastStatus: "failed", stale: true,
    };
    mockFetchLeaderboard.mockResolvedValueOnce(response({
      meta: { ...response().meta, sources: [staleSource] },
    }));
    mockFetchLeaderboard.mockRejectedValueOnce(new Error("network"));
    renderClient();
    await screen.findByText("1 个来源数据陈旧");
    fireEvent.click(screen.getByRole("tab", { name: "编程" }));
    expect(screen.queryByText("1 个来源数据陈旧")).toBeNull();
    expect(screen.queryByText(/数据更新于/)).toBeNull();
    await screen.findByRole("button", { name: "重试" });
    expect(screen.queryByText("1 个来源数据陈旧")).toBeNull();
  });
});
