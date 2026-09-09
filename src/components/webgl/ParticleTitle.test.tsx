// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { StrictMode, useRef } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { ThemeProvider, useTheme } from "next-themes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WebGLQuality } from "@/lib/webgl";
import ParticleTitle from "./ParticleTitle";

type Uniforms = Record<string, { value: number | number[] }>;
type TestProgram = { uniforms: Uniforms };

const mocks = vi.hoisted(() => ({
  programs: [] as TestProgram[],
  gate: vi.fn(), stopGate: vi.fn(), draw: vi.fn(), construct: vi.fn(),
  removeGeometry: vi.fn(), removeProgram: vi.fn(), deleteShader: vi.fn(),
  shader: vi.fn(), link: vi.fn(), error: vi.fn(), lost: vi.fn(),
  sample: vi.fn(), geometry: vi.fn(), blend: vi.fn(), loseContext: vi.fn(),
}));

vi.mock("@/lib/webgl", () => ({ observeRenderGate: mocks.gate }));
vi.mock("ogl", () => ({
  Renderer: class {
    gl = {
      canvas: document.createElement("canvas"),
      SRC_ALPHA: 770, ONE: 1, ONE_MINUS_SRC_ALPHA: 771, BLEND: 3042, POINTS: 0,
      COMPILE_STATUS: 35713, LINK_STATUS: 35714, NO_ERROR: 0,
      getShaderParameter: mocks.shader, getProgramParameter: mocks.link,
      getError: mocks.error, isContextLost: mocks.lost, deleteShader: mocks.deleteShader,
      enable: vi.fn(), blendFunc: mocks.blend, clearColor: vi.fn(),
      getExtension: () => ({ loseContext: mocks.loseContext }),
    };
    constructor() { mocks.construct(); }
    setSize = vi.fn();
    render = mocks.draw;
  },
  Geometry: class { constructor() { mocks.geometry(); } remove = mocks.removeGeometry; },
  Program: class {
    remove = mocks.removeProgram;
    uniforms: Uniforms;
    constructor(_gl: unknown, options: { uniforms: Uniforms }) {
      this.uniforms = options.uniforms;
      mocks.programs.push(this);
    }
  },
  Mesh: class {
    program: TestProgram;
    constructor(_gl: unknown, options: { program: TestProgram }) {
      this.program = options.program;
    }
  },
}));

const quality: WebGLQuality = {
  enabled: true, webglSupported: true, reducedMotion: false, tier: "high",
  dpr: 1.5, particleMultiplier: 1, mouseInteraction: true,
};
const titles = { en: "A pier has to hold at both ends", zh: "全栈的栈，也是栈桥的栈" };
const onFail = vi.fn();
const onReadyChange = vi.fn();

// 使用真实 next-themes 与项目 CSS；不能先改 html.class 再 rerender，
// 也不能按 isDark mock getComputedStyle，否则会掩盖父子 effect 的取色竞态。
const css = readFileSync("src/app/globals.css", "utf8");
const themeCSS = [":root", ".dark"].map(selector => {
  const block = css.slice(css.indexOf(`${selector} {`)).split("}")[0];
  const tokens = block.match(/--gradient-text-[123]:\s*#[\da-f]+;/gi);
  if (tokens?.length !== 3) throw new Error(`Missing title tokens in ${selector}`);
  return `${selector} { ${tokens.join(" ")} }`;
}).join("\n");

function TitleFixture({ title = titles.en }: { title?: string }) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  return <>
    <button onClick={() => setTheme("light")}>Light</button>
    <button onClick={() => setTheme("dark")}>Dark</button>
    <span ref={anchorRef}><span data-ptchar>{title}</span></span>
    <ParticleTitle title={title} anchorRef={anchorRef} isDark={resolvedTheme === "dark"}
      quality={quality} onFail={onFail} onReadyChange={onReadyChange} />
  </>;
}

function Fixture({ title = titles.en, initialTheme = "dark" }: {
  title?: string; initialTheme?: string;
}) {
  return <ThemeProvider attribute="class" defaultTheme={initialTheme}>
    <TitleFixture title={title} />
  </ThemeProvider>;
}

let frames: Map<number, FrameRequestCallback>;
let gateChange: (active: boolean) => void;
let style: HTMLStyleElement;

function palette(program = mocks.programs.at(-1)!) {
  return [1, 2, 3].map(i => program.uniforms[`uColor${i}`].value);
}

function cssPalette() {
  const style = getComputedStyle(document.documentElement);
  return [1, 2, 3].map(i => {
    const hex = style.getPropertyValue(`--gradient-text-${i}`).trim().slice(1);
    return [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  });
}

function frame(time: number) {
  const pending = [...frames.entries()];
  expect(pending).toHaveLength(1);
  frames.delete(pending[0][0]);
  act(() => pending[0][1](time));
}

async function finishBoot() {
  await act(async () => { await Promise.resolve(); });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mocks.programs.length = 0;
  mocks.shader.mockReturnValue(true);
  mocks.link.mockReturnValue(true);
  mocks.error.mockReturnValue(0);
  mocks.lost.mockReturnValue(false);
  window.localStorage.clear();
  document.documentElement.className = "";
  style = document.createElement("style");
  style.textContent = themeCSS;
  document.head.appendChild(style);
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches: false, addListener: vi.fn(), removeListener: vi.fn(),
  })));
  frames = new Map();
  let nextId = 1;
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
    const id = nextId++;
    frames.set(id, callback);
    return id;
  }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => frames.delete(id)));
  mocks.gate.mockImplementation((_element, onChange) => {
    gateChange = onChange;
    return mocks.stopGate;
  });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 100,
    width: 100, height: 100, toJSON() { return {}; },
  });
  mocks.sample.mockReturnValue({ data: new Uint8ClampedArray(100 * 100 * 4).fill(255) });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillText: vi.fn(), getImageData: mocks.sample,
  } as unknown as CanvasRenderingContext2D);
  Object.defineProperty(document, "fonts", {
    configurable: true, value: { ready: Promise.resolve() },
  });
});

afterEach(() => {
  cleanup();
  style.remove();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
  window.localStorage.clear();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ParticleTitle theme synchronization", () => {
  it.each(["dark", "light"])("initializes from the existing %s CSS palette", async initialTheme => {
    render(<Fixture initialTheme={initialTheme} />);
    await finishBoot();
    frame(0);
    expect(palette()).toEqual(cssPalette());
    expect(mocks.construct).toHaveBeenCalledOnce();
    expect(onFail).not.toHaveBeenCalled();
  });

  it.each(Object.entries(titles))("syncs both theme directions before drawing the %s title without rebuilding", async (_locale, title) => {
    const view = render(<Fixture title={title} />);
    await finishBoot();
    frame(0);
    frame(1800);
    const program = mocks.programs[0];
    const dark = cssPalette();
    const drawPalettes: (number | number[])[][] = [];
    mocks.draw.mockImplementation(({ scene }: { scene: { program: TestProgram } }) => {
      drawPalettes.push(palette(scene.program));
    });

    fireEvent.click(view.getByRole("button", { name: "Light" }));
    expect(document.documentElement.classList.contains("light")).toBe(true);
    const light = cssPalette();
    expect(light).not.toEqual(dark);
    frame(1900);
    expect(drawPalettes.at(-1)).toEqual(light);
    expect(mocks.blend).toHaveBeenLastCalledWith(770, 771);

    fireEvent.click(view.getByRole("button", { name: "Dark" }));
    frame(2000);
    expect(drawPalettes.at(-1)).toEqual(dark);
    expect(mocks.blend).toHaveBeenLastCalledWith(770, 1);
    expect(mocks.programs).toEqual([program]);
    expect(mocks.construct).toHaveBeenCalledOnce();
    expect(mocks.sample).toHaveBeenCalledOnce();
    expect(mocks.geometry).toHaveBeenCalledOnce();
    expect(program.uniforms.uProgress.value).toBe(1);
    expect(program.uniforms.uTime.value).toBe(2);
  });

  it.each([["Light", "Dark", "Light"], ["Light", "Dark"]])("coalesces rapid switches (%s first) without adding animation callbacks", async (...themes) => {
    const view = render(<Fixture />);
    await finishBoot();
    frame(0);
    const reads = vi.spyOn(window, "getComputedStyle");
    for (const name of themes) {
      fireEvent.click(view.getByRole("button", { name }));
    }
    expect(frames.size).toBe(1);
    reads.mockClear();
    frame(16);
    expect(reads).toHaveBeenCalledOnce();
    expect(palette()).toEqual(cssPalette());
    reads.mockClear();
    frame(32);
    expect(reads).not.toHaveBeenCalled();
    expect(mocks.programs).toHaveLength(1);
  });

  it("preserves the offscreen/hidden-tab gate and syncs the first resumed frame without jumping time", async () => {
    const view = render(<Fixture />);
    await finishBoot();
    frame(0);
    frame(100);
    const oldPalette = palette();
    act(() => gateChange(false));
    fireEvent.click(view.getByRole("button", { name: "Light" }));
    expect(frames.size).toBe(0);
    expect(palette()).toEqual(oldPalette);
    act(() => gateChange(true));
    frame(60000);
    expect(palette()).toEqual(cssPalette());
    expect(mocks.programs[0].uniforms.uTime.value).toBe(0.1);
    frame(60100);
    expect(mocks.programs[0].uniforms.uTime.value).toBe(0.2);
  });

  it("uses the latest theme if it changes while fonts are still loading", async () => {
    let resolveFonts!: () => void;
    Object.defineProperty(document.fonts, "ready", {
      configurable: true, value: new Promise<void>(resolve => { resolveFonts = resolve; }),
    });
    const view = render(<Fixture />);
    expect(mocks.programs).toHaveLength(0);
    fireEvent.click(view.getByRole("button", { name: "Light" }));
    await act(async () => resolveFonts());
    frame(0);
    expect(palette()).toEqual(cssPalette());
    expect(mocks.blend).toHaveBeenLastCalledWith(770, 771);
    expect(onFail).not.toHaveBeenCalled();
  });

  it("preserves the same CSS palette when a language change rebuilds the glyphs", async () => {
    const view = render(<Fixture />);
    await finishBoot();
    frame(0);
    fireEvent.click(view.getByRole("button", { name: "Light" }));
    view.rerender(<Fixture title={titles.zh} />);
    await finishBoot();
    frame(16);
    expect(palette()).toEqual(cssPalette());
    expect(mocks.programs).toHaveLength(2);
    expect(mocks.sample).toHaveBeenCalledTimes(2);
    expect(mocks.stopGate).toHaveBeenCalledOnce();
    expect(mocks.loseContext).toHaveBeenCalledOnce();
    expect(mocks.removeGeometry).toHaveBeenCalledOnce();
    expect(mocks.removeProgram).toHaveBeenCalledOnce();
    expect(mocks.deleteShader).toHaveBeenCalledTimes(2);
    expect(frames.size).toBe(1);
  });

  it("drops a pending theme refresh on unmount without another frame or GPU write", async () => {
    const view = render(<Fixture />);
    await finishBoot();
    frame(0);
    fireEvent.click(view.getByRole("button", { name: "Light" }));
    mocks.blend.mockClear();
    mocks.draw.mockClear();
    view.unmount();
    expect(frames.size).toBe(0);
    expect(mocks.blend).not.toHaveBeenCalled();
    expect(mocks.draw).not.toHaveBeenCalled();
    expect(mocks.stopGate).toHaveBeenCalledOnce();
    expect(mocks.loseContext).toHaveBeenCalledOnce();
    expect(view.container.querySelector("canvas")).toBeNull();
  });

  it("does not revive an unmounted renderer when pending fonts resolve", async () => {
    let resolveFonts!: () => void;
    Object.defineProperty(document.fonts, "ready", {
      configurable: true, value: new Promise<void>(resolve => { resolveFonts = resolve; }),
    });
    const view = render(<Fixture />);
    fireEvent.click(view.getByRole("button", { name: "Light" }));
    view.unmount();
    await act(async () => resolveFonts());
    expect(frames.size).toBe(0);
    expect(mocks.construct).not.toHaveBeenCalled();
    expect(onFail).not.toHaveBeenCalled();
  });

  it("keeps a single live renderer through StrictMode effect replay", async () => {
    const view = render(<StrictMode><Fixture /></StrictMode>);
    await finishBoot();
    frame(0);
    fireEvent.click(view.getByRole("button", { name: "Light" }));
    frame(16);
    expect(palette()).toEqual(cssPalette());
    expect(mocks.construct).toHaveBeenCalledOnce();
    expect(frames.size).toBe(1);
  });

  it.each(["sampling", "context"])("preserves the static fallback after a %s failure across theme changes", async failure => {
    if (failure === "sampling") {
      mocks.sample.mockReturnValueOnce({ data: new Uint8ClampedArray(100 * 100 * 4) });
    } else {
      mocks.construct.mockImplementationOnce(() => { throw new Error("WebGL unavailable"); });
    }
    const view = render(<Fixture />);
    await finishBoot();
    expect(onFail).toHaveBeenCalledOnce();
    fireEvent.click(view.getByRole("button", { name: "Light" }));
    expect(frames.size).toBe(0);
    expect(mocks.programs).toHaveLength(0);
    expect(view.container.querySelector("canvas")).toBeNull();
  });
});

describe("ParticleTitle draw readiness", () => {
  it("does not report ready until a validated draw and revokes on unmount", async () => {
    const view = render(<Fixture />);
    await finishBoot();
    expect(onReadyChange).not.toHaveBeenCalledWith(true);
    mocks.draw.mockImplementationOnce(() => {
      expect(onReadyChange).not.toHaveBeenCalledWith(true);
    });
    frame(0);
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
    expect(view.container.querySelector("[data-ptchar]")?.parentElement?.style.opacity).toBe("0");
    expect(view.container.querySelector("canvas")?.parentElement?.style.visibility).toBe("visible");
    frame(16);
    expect(onReadyChange.mock.calls.filter(([ready]) => ready)).toHaveLength(1);
    expect(mocks.error).toHaveBeenCalledOnce();
    view.unmount();
    expect(onReadyChange).toHaveBeenLastCalledWith(false);
    expect(frames.size).toBe(0);
  });

  it.each(["vertex", "fragment", "link", "sample-throws"])("never becomes ready after %s failure", async failure => {
    if (failure === "vertex") mocks.shader.mockReturnValueOnce(false);
    if (failure === "fragment") mocks.shader.mockReturnValueOnce(true).mockReturnValueOnce(false);
    if (failure === "link") mocks.link.mockReturnValueOnce(false);
    if (failure === "sample-throws") mocks.sample.mockImplementationOnce(() => { throw new Error("sample"); });
    const view = render(<Fixture />);
    await finishBoot();
    expect(onFail).toHaveBeenCalledOnce();
    expect(onReadyChange).not.toHaveBeenCalledWith(true);
    expect(frames.size).toBe(0);
    expect(view.container.querySelector("canvas")).toBeNull();
  });

  it.each(["throw", "gl-error", "lost"])("rejects an invalid first draw: %s", async failure => {
    render(<Fixture />);
    await finishBoot();
    if (failure === "throw") mocks.draw.mockImplementationOnce(() => { throw new Error("draw"); });
    if (failure === "gl-error") mocks.error.mockReturnValueOnce(1282);
    if (failure === "lost") mocks.lost.mockReturnValueOnce(true);
    frame(0);
    expect(onFail).toHaveBeenCalledOnce();
    expect(onReadyChange).not.toHaveBeenCalledWith(true);
    expect(frames.size).toBe(0);
  });

  it("revokes readiness on context loss without resuming on visibility changes", async () => {
    const view = render(<Fixture />);
    await finishBoot();
    frame(0);
    fireEvent(view.container.querySelector("canvas")!, new Event("webglcontextlost"));
    expect(onReadyChange).toHaveBeenLastCalledWith(false);
    expect(onFail).toHaveBeenCalledOnce();
    expect(view.container.querySelector("[data-ptchar]")?.parentElement?.style.opacity).toBe("1");
    act(() => gateChange(true));
    expect(frames.size).toBe(0);
    expect(view.container.querySelector("canvas")).toBeNull();
  });

  it("revokes readiness on a later render exception", async () => {
    render(<Fixture />);
    await finishBoot();
    frame(0);
    mocks.draw.mockImplementationOnce(() => { throw new Error("later draw"); });
    frame(16);
    expect(onReadyChange).toHaveBeenLastCalledWith(false);
    expect(onFail).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
  });

  it("keeps text available while waiting for fonts and throughout glyph rebuild", async () => {
    let resolveFonts!: () => void;
    Object.defineProperty(document.fonts, "ready", {
      configurable: true, value: new Promise<void>(resolve => { resolveFonts = resolve; }),
    });
    const view = render(<Fixture />);
    expect(onReadyChange).not.toHaveBeenCalledWith(true);
    await act(async () => resolveFonts());
    frame(0);
    onReadyChange.mockClear();
    view.rerender(<Fixture title={titles.zh} />);
    expect(onReadyChange).toHaveBeenLastCalledWith(false);
    await finishBoot();
    expect(onReadyChange).not.toHaveBeenCalledWith(true);
    frame(0);
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
  });

  it("revokes and revalidates readiness after a width rebuild", async () => {
    render(<Fixture />);
    await finishBoot();
    frame(0);
    onReadyChange.mockClear();
    vi.stubGlobal("innerWidth", window.innerWidth + 100);
    fireEvent(window, new Event("resize"));
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(onReadyChange).toHaveBeenLastCalledWith(false);
    await finishBoot();
    frame(0);
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
    expect(mocks.construct).toHaveBeenCalledTimes(2);
  });

  it("revalidates GL errors when the render gate resumes", async () => {
    render(<Fixture />);
    await finishBoot();
    frame(0);
    act(() => gateChange(false));
    mocks.error.mockReturnValueOnce(1282);
    act(() => gateChange(true));
    frame(16);
    expect(onReadyChange).toHaveBeenLastCalledWith(false);
    expect(onFail).toHaveBeenCalledOnce();
  });

});
