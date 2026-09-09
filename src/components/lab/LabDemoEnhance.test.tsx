// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { LabDemoEnhance } from "./LabDemoEnhance";
import type { LabDemoId } from "./lab-demos";
import { LAB_DEMO_IDS } from "./lab-demos";

const state = vi.hoisted(() => ({ quality: { webglSupported: true, reducedMotion: false, tier: "high", dpr: 1.5, particleMultiplier: 1, mouseInteraction: true, enabled: true }, callbacks: [] as Array<(ready: boolean) => void>, constructors: 0 }));
vi.mock("@/lib/webgl", () => ({ useWebGLQuality: () => state.quality }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("next-intl", () => ({ useLocale: () => "zh" }));
vi.mock("next/dynamic", () => ({ default: () => function Demo({ onReadyChange }: { onReadyChange: (ready: boolean) => void }) {
  state.constructors++;
  if (!state.callbacks.includes(onReadyChange)) state.callbacks.push(onReadyChange);
  return <div data-testid="runtime"><button type="button">运行控件</button></div>;
} }));
let visibility: IntersectionObserverCallback;
beforeEach(() => {
  state.callbacks.length = 0; state.constructors = 0; state.quality.enabled = true; state.quality.reducedMotion = false;
  vi.stubGlobal("IntersectionObserver", class { constructor(cb: IntersectionObserverCallback) { visibility = cb; } observe = vi.fn(); disconnect = vi.fn(); });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const demo = () => <LabDemoEnhance id="fluid" still="/lab/fluid.webp" alt="流体海报" />;
async function near() { await act(async () => visibility([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)); }
async function ready(value: boolean, callback = state.callbacks.at(-1)!) { await act(async () => callback(value)); }

describe("Lab progressive enhancement", () => {
  it.each(LAB_DEMO_IDS)("keeps the %s poster readable with reduced motion and never starts its runtime", async (id) => {
    state.quality.reducedMotion = true;
    render(<LabDemoEnhance id={id} still={`/lab/${id}.webp`} alt={`${id} preview`} />);
    await near();
    expect(screen.getByRole("img", { name: `${id} preview` }).className).not.toContain("invisible");
    expect(screen.queryByTestId("runtime")).toBeNull();
    expect(state.constructors).toBe(0);
  });
  it.each(["fluid", "particles", "shader", "morph", "sdf"] as const)("keeps the %s poster readable without WebGL", async (id) => {
    state.quality.enabled = false;
    render(<LabDemoEnhance id={id} still={`/lab/${id}.webp`} alt={`${id} preview`} />);
    await near();
    expect(screen.getByRole("img", { name: `${id} preview` }).className).not.toContain("invisible");
    expect(screen.queryByTestId("runtime")).toBeNull();
  });
  it("keeps the poster in SSR, without initializing distant demos", () => {
    expect(renderToString(demo())).toContain("/lab/fluid.webp");
    render(demo()); expect(screen.getByAltText("流体海报")).toBeTruthy(); expect(screen.queryByTestId("runtime")).toBeNull(); expect(state.constructors).toBe(0);
  });
  it("hides the poster only after the first rendered frame, then restores it on failure", async () => {
    render(demo()); await near(); expect(screen.getByTestId("runtime")).toBeTruthy();
    expect(screen.getByAltText("流体海报").className).not.toContain("invisible");
    await ready(true); expect(screen.getByAltText("流体海报").className).toContain("invisible");
    await ready(false); expect(screen.getByAltText("流体海报").className).not.toContain("invisible"); expect(screen.queryByTestId("runtime")).toBeNull(); expect(screen.getByRole("status").textContent).toContain("重试");
  });
  it("allows reset and ignores stale cleanup from the previous runtime", async () => {
    render(demo()); await near(); const oldReady = state.callbacks[0]; await ready(true);
    fireEvent.click(screen.getByRole("button", { name: /重置演示/ }));
    await ready(false, oldReady); expect(screen.queryByRole("status")).toBeNull(); expect(screen.getByTestId("runtime")).toBeTruthy();
    await ready(true); expect(screen.getByAltText("流体海报").className).toContain("invisible");
  });
  it("makes the not-yet-rendered runtime inert and hides its controls from accessibility", async () => {
    render(demo()); await near();
    const wrapper = screen.getByTestId("runtime").parentElement!;
    expect(wrapper.hasAttribute("inert")).toBe(true);
    expect(wrapper.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByRole("button", { name: "运行控件" })).toBeNull();
    expect(screen.getByRole("button", { name: /重置演示/ }).closest("[inert]")).toBeNull();
    await ready(true);
    expect(wrapper.hasAttribute("inert")).toBe(false);
    expect(wrapper.getAttribute("aria-hidden")).toBe("false");
    expect(screen.getByRole("button", { name: "运行控件" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /重置演示/ }));
    expect(screen.getByTestId("runtime").parentElement!.hasAttribute("inert")).toBe(true);
  });
  it.each(["sdf", "cloth", "pathfinding", "raft", "audio", "geometry"] as LabDemoId[])("keeps recovery but removes the duplicate ready overlay for %s", async (id) => {
    render(<LabDemoEnhance id={id} still={`/lab/${id}.webp`} alt="演示海报" />); await near();
    expect(screen.getByRole("button", { name: /重置演示/ })).toBeTruthy();
    await ready(true); expect(screen.queryByRole("button", { name: /重置演示/ })).toBeNull();
    expect(screen.getByRole("button", { name: "运行控件" })).toBeTruthy();
    await ready(false); const retry = screen.getByRole("button", { name: /重置演示/ });
    expect(retry.textContent).toBe("重试"); fireEvent.click(retry);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("button", { name: /重置演示/ }).textContent).toBe("重置");
    expect(screen.getByTestId("runtime").parentElement!.hasAttribute("inert")).toBe(true);
    await ready(true); expect(screen.queryByRole("button", { name: /重置演示/ })).toBeNull();
  });
  it.each(["fluid", "physics", "flow", "particles", "morph", "shader"] as LabDemoId[])("retains the sole overlay reset for the original %s demo", async (id) => {
    render(<LabDemoEnhance id={id} still={`/lab/${id}.webp`} alt="演示海报" />); await near(); await ready(true);
    expect(screen.getByRole("button", { name: /重置演示/ })).toBeTruthy();
  });
  it("uses a truthful static fallback with no controls for reduced motion or missing WebGL", async () => {
    state.quality.reducedMotion = true;
    const { rerender } = render(demo()); await near(); expect(screen.queryByTestId("runtime")).toBeNull(); expect(screen.queryByRole("button")).toBeNull();
    state.quality.reducedMotion = false; state.quality.enabled = false; rerender(demo()); expect(screen.queryByTestId("runtime")).toBeNull();
  });
});
