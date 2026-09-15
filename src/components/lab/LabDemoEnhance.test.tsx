// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { LabDemoEnhance } from "./LabDemoEnhance";
import { EXPERIENCE_DEMO_IDS, LAB_DEMO_IDS, type LabDemoId } from "./lab-demos";

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
let observerOptions: IntersectionObserverInit | undefined;
beforeEach(() => {
  state.callbacks.length = 0; state.constructors = 0; state.quality.enabled = true; state.quality.reducedMotion = false;
  vi.stubGlobal("IntersectionObserver", class {
    constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) { visibility = cb; observerOptions = options; }
    observe = vi.fn(); disconnect = vi.fn();
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const demo = () => <LabDemoEnhance id="fluid" still="/lab/fluid.webp" alt="流体海报" />;
async function near(inView = true) { await act(async () => visibility([{ isIntersecting: inView } as IntersectionObserverEntry], {} as IntersectionObserver)); }
async function ready(value: boolean, callback = state.callbacks.at(-1)!) { await act(async () => callback(value)); }
const poster = () => document.querySelector(".lab-demo-poster")!;
const host = () => document.querySelector("[data-demo]")!;

describe("Lab progressive enhancement", () => {
  it.each(LAB_DEMO_IDS.filter((id) => !(EXPERIENCE_DEMO_IDS as readonly string[]).includes(id)))("keeps the %s poster with reduced motion and never starts its runtime", async (id) => {
    state.quality.reducedMotion = true;
    render(<LabDemoEnhance id={id} still={`/lab/${id}.webp`} alt={`${id} preview`} />);
    await near();
    expect(poster().getAttribute("aria-hidden")).toBe("false");
    expect(screen.queryByTestId("runtime")).toBeNull();
    expect(state.constructors).toBe(0);
  });
  it.each(EXPERIENCE_DEMO_IDS)("renders the real %s controls in SSR and never replaces them with a poster", (id) => {
    const element = <LabDemoEnhance id={id} still={`/lab/${id}.webp`} alt="preview" />;
    const html = renderToString(element);
    expect(html).toContain("<button");
    expect(html).toContain('data-renderer="dom"');
    expect(html).not.toContain("<img");
    state.quality.reducedMotion = true; state.quality.enabled = false;
    render(element);
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
    expect(screen.queryByRole("img")).toBeNull();
    expect(state.constructors).toBe(0);
  });
  it.each(["fluid", "particles", "shader", "morph", "sdf", "cloudsea"] as const)("keeps the %s poster without WebGL", async (id) => {
    state.quality.enabled = false;
    render(<LabDemoEnhance id={id} still={`/lab/${id}.webp`} alt="preview" />);
    await near();
    expect(poster().getAttribute("aria-hidden")).toBe("false");
    expect(screen.queryByTestId("runtime")).toBeNull();
  });
  it("ships both theme previews in SSR and prepares nearby demos without starting distant ones", () => {
    const html = renderToString(demo());
    expect(html).toContain("/lab/fluid.webp");
    expect(html).toContain("/lab/fluid-light.webp");
    render(demo());
    expect(screen.queryByTestId("runtime")).toBeNull();
    expect(observerOptions?.rootMargin).toBe("1000px 0px");
  });
  it("reveals the first rendered frame and restores the preview on failure", async () => {
    render(demo()); await near();
    expect(host().getAttribute("data-ready")).toBe("false");
    await ready(true);
    expect(host().getAttribute("data-ready")).toBe("true");
    expect(poster().getAttribute("aria-hidden")).toBe("true");
    await ready(false);
    expect(poster().getAttribute("aria-hidden")).toBe("false");
    expect(screen.queryByTestId("runtime")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("重试");
  });
  it("does not hide or replace a ready demo when scrolling away and back", async () => {
    render(demo()); await near(); await ready(true);
    const runtime = screen.getByTestId("runtime");
    await near(false); await near();
    expect(screen.getByTestId("runtime")).toBe(runtime);
    expect(host().getAttribute("data-ready")).toBe("true");
  });
  it("allows reset and ignores stale callbacks from the previous runtime", async () => {
    render(demo()); await near(); const oldReady = state.callbacks[0]; await ready(true);
    fireEvent.click(screen.getByRole("button", { name: /重置演示/ }));
    await ready(false, oldReady);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByTestId("runtime")).toBeTruthy();
    await ready(true);
    expect(host().getAttribute("data-ready")).toBe("true");
  });
  it("keeps the runtime inert until its first frame", async () => {
    render(demo()); await near();
    const wrapper = screen.getByTestId("runtime").parentElement!;
    expect(wrapper.hasAttribute("inert")).toBe(true);
    expect(screen.queryByRole("button", { name: "运行控件" })).toBeNull();
    await ready(true);
    expect(wrapper.hasAttribute("inert")).toBe(false);
    expect(screen.getByRole("button", { name: "运行控件" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /重置演示/ }));
    expect(screen.getByTestId("runtime").parentElement!.hasAttribute("inert")).toBe(true);
  });
  it.each(["sdf", "cloudsea", "cloth", "pathfinding", "raft", "audio", "geometry"] as LabDemoId[])("retains recovery without a duplicate ready reset for %s", async (id) => {
    render(<LabDemoEnhance id={id} still={`/lab/${id}.webp`} alt="preview" />); await near();
    await ready(true); expect(screen.queryByRole("button", { name: /重置演示/ })).toBeNull();
    await ready(false);
    const retry = screen.getByRole("button", { name: /重置演示/ });
    expect(retry.textContent).toBe("重试"); fireEvent.click(retry);
    expect(screen.queryByRole("status")).toBeNull();
    await ready(true); expect(screen.queryByRole("button", { name: /重置演示/ })).toBeNull();
  });
  it.each(["fluid", "physics", "flow", "particles", "morph", "shader"] as LabDemoId[])("retains the sole overlay reset for %s", async (id) => {
    render(<LabDemoEnhance id={id} still={`/lab/${id}.webp`} alt="preview" />); await near(); await ready(true);
    expect(screen.getByRole("button", { name: /重置演示/ })).toBeTruthy();
  });
});
