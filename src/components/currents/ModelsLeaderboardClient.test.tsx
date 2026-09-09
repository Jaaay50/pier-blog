// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModelsLeaderboardClient } from "./ModelsLeaderboardClient";
import type { ModelRate, ModelsPrice, ModelsLeaderboardResponse, ModelsLeaderboardRow } from "@/lib/currents/models-types";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";

const mockFetchLeaderboard = vi.fn();

vi.mock("@/lib/currents/api", () => ({
  fetchModelsLeaderboard: (...args: unknown[]) => mockFetchLeaderboard(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const messages = {
  currents: {
    ...zh.currents,
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
    modelsComputedAt: "榜单计算于 {time}",
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

function renderClient(initial?: ModelsLeaderboardResponse) {
  return render(
    <NextIntlClientProvider locale="zh" messages={messages}>
      <ModelsLeaderboardClient initial={initial} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => { mockFetchLeaderboard.mockReset(); });

describe("ModelsLeaderboardClient", () => {
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
    // 价格缺失显示空值，不推断厂商未定价
    expect(screen.queryByText("未挂牌")).toBeNull();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    // 可信度分档
    expect(screen.getAllByText(/高 0\.90/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/低 0\.40/).length).toBeGreaterThanOrEqual(1);
    // 排名变化：↑ ↓ 与首次 —
    expect(screen.getAllByLabelText("上升 1 位")[0].textContent).toContain("↑");
    expect(screen.getAllByLabelText("下降 1 位")[0].textContent).toContain("↓");
    expect(screen.getAllByLabelText("首次收录，暂无排名变化").length).toBeGreaterThanOrEqual(1);
    // 观察中分组
    expect(screen.queryByText("观察中")).toBeNull();
    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(screen.getAllByText("GLM-5.2").length).toBeGreaterThanOrEqual(1);
    // 数据时间
    expect(screen.getByText(/榜单计算于/)).toBeTruthy();
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

  it("来源状态留在详情与方法页，保留 Preview 身份", async () => {
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
    expect(screen.queryByText("1 个来源数据陈旧")).toBeNull();
    expect(screen.queryByText("数据陈旧")).toBeNull();
    expect(document.querySelector('[data-mobile-stale="hy3"]')).toBeNull();
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
    await screen.findAllByText("Claude Opus 5");
    fireEvent.click(screen.getByRole("tab", { name: "编程" }));
    expect(screen.queryByText("1 个来源数据陈旧")).toBeNull();
    expect(screen.queryByText(/榜单计算于/)).toBeNull();
    await screen.findByRole("button", { name: "重试" });
    expect(screen.queryByText("1 个来源数据陈旧")).toBeNull();
  });

  it("新版状态区分检查与内容变化，切换失败不残留上一榜状态", async () => {
    mockFetchLeaderboard.mockResolvedValueOnce(response({ meta: {
      ...response().meta,
      update: {
        lastAttemptAt: "2026-09-07T01:00:00.000Z", lastContentChangeAt: "2026-08-13T10:00:00.000Z",
        lastCompleteSuccessAt: null, lastPublishedAt: null, nextScheduledCheckAt: null,
        status: "partial", sources: [],
      },
    } }));
    mockFetchLeaderboard.mockRejectedValueOnce(new Error("network"));
    renderClient();
    await screen.findByText(/最近检查/);
    expect(screen.queryByText(/部分来源检查失败/)).toBeNull();
    expect(screen.getByText(/最近检查/)).toBeTruthy();
    expect(screen.getByText(/成绩变化/)).toBeTruthy();
    expect(screen.queryByText(/榜单计算于/)).toBeNull();
    expect(screen.queryByText(/下次计划检查/)).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "编程" }));
    expect(screen.queryByText(/最近检查/)).toBeNull();
    await screen.findByRole("button", { name: "重试" });
    expect(screen.queryByText(/部分来源检查失败/)).toBeNull();
  });
});

it("renders ISR initial data without waiting for a duplicate client request", () => {
  renderClient(response());
  expect(screen.getAllByText("Claude Opus 5")).toHaveLength(2);
  expect(mockFetchLeaderboard).not.toHaveBeenCalled();
  expect(screen.queryByText("底部说明")).toBeNull();
});

afterEach(() => cleanup());

it("renders missing evaluations without fabricated zeros", async () => {
 mockFetchLeaderboard.mockResolvedValue(response({items:[row({slug:"new-model",name:"New Model",rank:null,abilityScore:null,confidence:null,computedAt:null})],observing:[]}));
 renderClient();
 await waitFor(()=>expect(screen.getAllByText("New Model").length).toBe(2));
 expect(screen.queryByText("0.0")).toBeNull();
 expect(screen.getAllByText("—").length).toBeGreaterThan(3);
});
it("never substitutes ability for missing value score", async () => {
 mockFetchLeaderboard.mockImplementation((category:string)=>Promise.resolve(response({category:category as ModelsLeaderboardResponse["category"],items:[row({slug:"no-price",name:"No Price",abilityScore:90.5,valueScore:null,price:{kind:"unavailable",inputUsdPerMtok:null,outputUsdPerMtok:null,sourceUrl:null,verifiedAt:null,notes:null}})],observing:[]})));
 renderClient();
 fireEvent.click(screen.getByRole("tab",{name:"性价比"}));
 await waitFor(()=>expect(screen.getByRole("columnheader",{name:"性价比分"})).toBeTruthy());
 const tr=screen.getByRole("table").querySelector("tbody tr")!;
 expect(tr.children[2].querySelector("span")?.textContent).toBe("—");
 expect(tr.children[2].textContent).toContain("能力 90.5");
});

it("expires a mounted quote at its boundary while leaving the ability score intact", async () => {
  vi.useFakeTimers();
  const now=Date.parse("2026-09-09T00:00:00Z");vi.setSystemTime(now);
  try {
    const data=response();data.meta.generatedAt=new Date(now).toISOString();
    data.items[0].price={kind:"payg",inputUsdPerMtok:.1,outputUsdPerMtok:.5,sourceUrl:"https://example.com/prices",verifiedAt:new Date(now).toISOString(),notes:null,
      rates:[{id:"promo",currency:"USD",inputPerMtok:.1,outputPerMtok:.5,region:"global",contextMin:0,contextMax:null,serviceTier:"standard",timeBand:"all",schedule:null,effectiveFrom:null,effectiveUntil:new Date(now+1000).toISOString(),sourceUrl:"https://example.com/prices",verifiedAt:new Date(now).toISOString()}]};
    renderClient(data);
    const priceCell=()=>screen.getByRole("table").querySelector("tbody tr")!.children[4];
    expect(within(priceCell() as HTMLElement).getByText("$0.1 / $0.5")).toBeTruthy();
    expect(within(priceCell() as HTMLElement).getByRole("link", { name: /待核验/ })).toBeTruthy();
    await act(async()=>vi.advanceTimersByTimeAsync(1000));
    expect(within(priceCell() as HTMLElement).getByText("—")).toBeTruthy();
    expect(within(priceCell() as HTMLElement).getByRole("link", { name: /待重新核验/ })).toBeTruthy();
    expect(screen.getByRole("table").querySelector("tbody tr")!.children[2].textContent).toContain("90.5");
  } finally {cleanup();vi.useRealTimers();}
});

it("expires the entire value board at the global boundary for an unlisted competing tariff", async()=>{
  vi.useFakeTimers();const now=Date.parse('2026-09-09T00:00:00Z');vi.setSystemTime(now);
  try{
    const value=response({category:'value',items:[row({slug:'unchanged',name:'Unchanged',valueScore:81.4})],observing:[]});
    value.meta.generatedAt=new Date(now).toISOString();value.meta.valueValidUntil=new Date(now+1000).toISOString();
    mockFetchLeaderboard.mockResolvedValue(value);
    renderClient(response());
    await act(async()=>{fireEvent.click(screen.getByRole('tab',{name:'性价比'}));});
    expect(screen.getAllByText('81.4').length).toBeGreaterThan(0);
    await act(async()=>vi.advanceTimersByTimeAsync(1000));
    expect(screen.queryByText('81.4')).toBeNull();
    const priceCell=screen.getByRole('table').querySelector('tbody tr')!.children[4] as HTMLElement;
    expect(within(priceCell).getByText('$5 / $25')).toBeTruthy();
    expect(within(priceCell).getByRole('link',{name:/待核验/})).toBeTruthy();
  } finally {cleanup();vi.useRealTimers();}
});


describe("leaderboard price provenance signals", () => {
  const now = Date.parse("2026-09-09T00:00:00Z");
  const verifiedAt = "2026-09-08T12:34:56Z";
  const sourceUrl = "https://example.com/official-model-pricing";
  const rate: ModelRate = {
    id: "standard", currency: "USD", inputPerMtok: 1.25, outputPerMtok: 4.5,
    region: "global", contextMin: 0, contextMax: null, serviceTier: "standard",
    timeBand: "all", schedule: null, effectiveFrom: null, effectiveUntil: null,
    sourceUrl, verifiedAt,
  };
  const verification = { status: "verified" as const, checkedAt: verifiedAt, lastErrorCode: null };
  const base: ModelsPrice = {
    kind: "payg", inputUsdPerMtok: 1.25, outputUsdPerMtok: 4.5,
    sourceUrl, verifiedAt, notes: null, rates: [rate], verification,
  };
  const unavailable: ModelsPrice = {
    ...base, kind: "unavailable", inputUsdPerMtok: null, outputUsdPerMtok: null,
    rates: [], verifiedAt: null, verification: { ...verification, status: "unknown" },
  };
  const labels = {
    zh: { retained: "沿用旧价", unknown: "待核验", failed: "抓取失败", missing: "暂无已核验价格", reverify: "待重新核验" },
    en: { retained: "Retained price", unknown: "Unverified", failed: "Fetch failed", missing: "No verified price", reverify: "Reverification required" },
  };
  type State = keyof typeof labels.zh;
  const cases: Array<{ name: string; price: ModelsPrice; amount: string; state: State | null }> = [
    { name: "fresh verified", price: base, amount: "$1.25 / $4.5", state: null },
    { name: "stale retains numbers", price: { ...base, verification: { ...verification, status: "stale", lastErrorCode: "fetch_failed" } }, amount: "$1.25 / $4.5", state: "retained" },
    { name: "stale without error", price: { ...base, verification: { ...verification, status: "stale" } }, amount: "$1.25 / $4.5", state: "retained" },
    { name: "unknown price", price: { ...base, verification: { ...verification, status: "unknown" } }, amount: "$1.25 / $4.5", state: "unknown" },
    { name: "legacy missing verification", price: { ...base, rates: [], verification: undefined }, amount: "$1.25 / $4.5", state: "unknown" },
    { name: "verified with parser error", price: { ...base, verification: { ...verification, lastErrorCode: "parse_failed" } }, amount: "$1.25 / $4.5", state: "retained" },
    { name: "verified missing date", price: { ...base, verifiedAt: null }, amount: "$1.25 / $4.5", state: "retained" },
    { name: "verified invalid date", price: { ...base, verifiedAt: "invalid" }, amount: "$1.25 / $4.5", state: "retained" },
    { name: "verified older than seven days", price: { ...base, verifiedAt: new Date(now - 7 * 86_400_000 - 1).toISOString() }, amount: "$1.25 / $4.5", state: "retained" },
    { name: "verified at seven day boundary", price: { ...base, verifiedAt: new Date(now - 7 * 86_400_000).toISOString() }, amount: "$1.25 / $4.5", state: null },
    { name: "unavailable fetch failure", price: { ...unavailable, verification: { ...verification, status: "unknown", lastErrorCode: "fetch_failed" } }, amount: "—", state: "failed" },
    { name: "fetch failure takes priority over stale", price: { ...unavailable, verification: { ...verification, status: "stale", lastErrorCode: "fetch_failed" } }, amount: "—", state: "failed" },
    { name: "unavailable unknown is not unpublished", price: unavailable, amount: "—", state: "missing" },
    { name: "unavailable without verification", price: { ...unavailable, verification: undefined }, amount: "—", state: "missing" },
    { name: "unavailable stale", price: { ...unavailable, verification: { ...verification, status: "stale" } }, amount: "—", state: "reverify" },
    { name: "unavailable parser error", price: { ...unavailable, verification: { ...verification, lastErrorCode: "parse_failed" } }, amount: "—", state: "reverify" },
    { name: "expired rates never revive flat prices", price: { ...base, rates: [{ ...rate, effectiveUntil: new Date(now).toISOString() }] }, amount: "—", state: "reverify" },
    { name: "upcoming rates never revive flat prices", price: { ...base, rates: [{ ...rate, effectiveFrom: new Date(now + 86_400_000).toISOString() }] }, amount: "—", state: "reverify" },
    { name: "unavailable CNY still has a price", price: { ...unavailable, verifiedAt, verification, rates: [{ ...rate, currency: "CNY" }] }, amount: "CN¥1.25 / CN¥4.5", state: null },
    { name: "unavailable Beta retains formatter suffix", price: { ...unavailable, verifiedAt, verification: { ...verification, status: "stale" }, rates: [{ ...rate, serviceTier: "beta" }] }, amount: "$1.25 / $4.5 · Beta", state: "retained" },
    { name: "explicit zero is still a price", price: { ...base, rates: [{ ...rate, inputPerMtok: 0, outputPerMtok: 0 }] }, amount: "$0 / $0", state: null },
  ];

  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  describe.each(["zh", "en"] as const)("%s", (locale) => {
    it.each(cases)("$name in desktop and mobile markup", ({ price, amount, state }) => {
      const name = "Provenance Model";
      const slug = "provenance-model";
      const data = response({ items: [row({ slug, name, price })], observing: [] });
      data.meta.generatedAt = new Date(now).toISOString();
      const { container } = render(
        <NextIntlClientProvider locale={locale} messages={locale === "zh" ? zh : en}>
          <ModelsLeaderboardClient initial={data} />
        </NextIntlClientProvider>,
      );
      const modelLinks = screen.getAllByRole("link", { name });
      expect(modelLinks).toHaveLength(2);
      const href = `/currents/models/${slug}#model-pricing`;
      for (const modelLink of modelLinks) {
        expect(modelLink.getAttribute("href")).toBe(`/currents/models/${slug}`);
        const scope = modelLink.closest("tr, li") as HTMLElement;
        const priceScope = scope.tagName === "TR" ? scope.children[4] as HTMLElement : scope;
        expect(within(priceScope).getAllByText(amount).length).toBeGreaterThanOrEqual(1);
        if (amount === "—") expect(scope.textContent).not.toContain("$1.25 / $4.5");
        if (state) {
          const status = labels[locale][state];
          const template = (locale === "zh" ? zh : en).currents.modelsPriceDetailsLabel;
          const accessibleName = template.replace("{status}", status).replace("{model}", name);
          const link = within(scope).getByRole("link", { name: accessibleName });
          expect(link.textContent?.startsWith(status)).toBe(true);
          expect(link.getAttribute("href")).toBe(href);
          expect(link.className).toContain("focus-visible:");
        } else {
          expect(scope.querySelector(`a[href="${href}"]`)).toBeNull();
          for (const status of Object.values(labels[locale])) expect(within(scope).queryByText(status)).toBeNull();
        }
        expect(scope.querySelector("time")).toBeNull();
        expect(scope.textContent).not.toContain(verifiedAt);
        expect(scope.textContent).not.toContain("12:34");
        expect(scope.textContent).not.toMatch(/原厂未公开|未挂牌|Not listed|Unpublished/);
      }
      expect(container.querySelector(`a[href="${sourceUrl}"]`)).toBeNull();
      expect(container.textContent).not.toContain(sourceUrl);
      expect(mockFetchLeaderboard).not.toHaveBeenCalled();
    });
  });
});
