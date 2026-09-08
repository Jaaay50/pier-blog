// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImmersiveHero } from "./ImmersiveHero";

const mocks = vi.hoisted(() => ({
  theme: vi.fn(), quality: vi.fn(), locale: vi.fn(), aurora: vi.fn(), galaxy: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: mocks.theme,
}));

vi.mock("next-intl", () => ({
  useLocale: mocks.locale,
}));

vi.mock("@/lib/webgl", () => ({
  useWebGLQuality: mocks.quality,
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    if (loader.toString().includes("reactbits/Aurora")) {
      return function MockAurora(props: unknown) { mocks.aurora(props); return <canvas data-aurora />; };
    }
    if (loader.toString().includes("reactbits/Galaxy")) {
      return function MockGalaxy(props: unknown) { mocks.galaxy(props); return <canvas data-galaxy />; };
    }
    return () => null;
  },
}));

vi.mock("@/components/reactbits/ShinyText", () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<React.ComponentProps<"div">>) => <div {...props}>{children}</div>,
    svg: ({
      children,
      ...props
    }: React.PropsWithChildren<React.ComponentProps<"svg">>) => <svg {...props}>{children}</svg>,
    span: ({
      children,
      ...props
    }: React.PropsWithChildren<React.ComponentProps<"span">>) => <span {...props}>{children}</span>,
  },
  useScroll: () => ({ scrollY: { get: () => 0 } }),
  useTransform: () => 0,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.locale.mockReturnValue("zh");
  mocks.theme.mockReturnValue({ resolvedTheme: "dark" });
  mocks.quality.mockReturnValue(null);
});

afterEach(() => {
  cleanup();
});

describe("ImmersiveHero light atmosphere", () => {
  const quality = {
    enabled: true, reducedMotion: false, webglSupported: true,
    tier: "high", dpr: 1.5, particleMultiplier: 1, mouseInteraction: false,
  };
  const light = () => {
    mocks.theme.mockReturnValue({ resolvedTheme: "light" });
    mocks.quality.mockReturnValue(quality);
  };

  it("includes a CSS-selected light fallback before hydration without changing the dark SSR background", () => {
    mocks.theme.mockReturnValue({ resolvedTheme: undefined });
    const html = renderToString(<ImmersiveHero subtitle="副标题" />);
    expect(html).toContain('data-theme="light"');
    expect(html).toContain('data-ready="false"');
    expect(html).toContain("hero-light-static");
    expect(html).not.toContain("<canvas");
  });

  it("opts only the light homepage into the approved palette and motion parameters", () => {
    light();
    const { container } = render(<ImmersiveHero subtitle="副标题" />);
    expect(mocks.aurora).toHaveBeenCalledWith(expect.objectContaining({
      lightMode: true, backgroundColor: "#faf9f5",
      colorStops: ["#d97757", "#e8c4a0", "#c6613f"],
      speed: 1, amplitude: 1.2, blend: 0.5,
    }));
    expect(mocks.galaxy).not.toHaveBeenCalled();
    expect(container.querySelector(".hero-light-content-veil")?.closest(".hero-atmosphere")).not.toBeNull();
    expect(container.querySelector(".hero-light-content-veil")?.closest("h1")).toBeNull();
    expect(container.querySelector("h1")?.getAttribute("aria-label")).toBe("全栈的栈，也是栈桥的栈");
  });

  it("uses the same light background without changing the English homepage title", () => {
    light();
    mocks.locale.mockReturnValue("en");
    const { container } = render(<ImmersiveHero subtitle="English subtitle" />);
    expect(container.querySelector("h1")?.getAttribute("aria-label")).toBe("A pier has to hold at both ends");
    expect(mocks.aurora).toHaveBeenCalledWith(expect.objectContaining({
      lightMode: true, backgroundColor: "#faf9f5", speed: 1, amplitude: 1.2, blend: 0.5,
    }));
    expect(container.querySelector(".hero-light-content-veil")).not.toBeNull();
  });

  it("hydrates the static background before enabling the client-rendered Aurora", async () => {
    mocks.theme.mockReturnValue({ resolvedTheme: "light" });
    const element = <ImmersiveHero subtitle="副标题" />;
    const container = document.createElement("div");
    container.innerHTML = renderToString(element);
    document.body.appendChild(container);
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => { root = hydrateRoot(container, element, { onRecoverableError }); });
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.querySelector(".hero-light-static")).not.toBeNull();
      expect(container.querySelector("[data-aurora]")).toBeNull();
      mocks.quality.mockReturnValue(quality);
      await act(async () => { root?.render(<ImmersiveHero subtitle="副标题" />); });
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.querySelector("[data-aurora]")).not.toBeNull();
      expect(container.querySelector(".hero-light-atmosphere")?.getAttribute("data-ready")).toBe("false");
    } finally {
      await act(async () => { root?.unmount(); });
      container.remove();
    }
  });

  it("resets light readiness across a light-to-dark-to-light theme round trip", () => {
    light();
    const { container, rerender } = render(<ImmersiveHero subtitle="副标题" />);
    act(() => mocks.aurora.mock.lastCall![0].onReadyChange(true));
    mocks.theme.mockReturnValue({ resolvedTheme: "dark" });
    rerender(<ImmersiveHero subtitle="副标题" />);
    expect(container.querySelector(".hero-light-atmosphere")).toBeNull();
    expect(container.querySelector("[data-galaxy]")).not.toBeNull();
    mocks.theme.mockReturnValue({ resolvedTheme: "light" });
    rerender(<ImmersiveHero subtitle="副标题" />);
    expect(container.querySelector("[data-galaxy]")).toBeNull();
    expect(container.querySelector(".hero-light-atmosphere")?.getAttribute("data-ready")).toBe("false");
    act(() => mocks.aurora.mock.lastCall![0].onReadyChange(true));
    expect(container.querySelector(".hero-light-atmosphere")?.getAttribute("data-ready")).toBe("true");
  });

  it("keeps the static fallback until a successful frame and restores it on GPU failure", () => {
    light();
    const { container } = render(<ImmersiveHero subtitle="副标题" />);
    const root = container.querySelector(".hero-light-atmosphere")!;
    const { onReadyChange } = mocks.aurora.mock.lastCall![0];
    expect(root.getAttribute("data-ready")).toBe("false");
    act(() => onReadyChange(true));
    expect(root.getAttribute("data-ready")).toBe("true");
    act(() => onReadyChange(false));
    expect(root.getAttribute("data-ready")).toBe("false");
    expect(root.querySelector(".hero-light-static")).not.toBeNull();
  });

  it.each([
    { reducedMotion: true }, { webglSupported: false }, { tier: "low" },
  ])("does not mount Aurora when the quality gate disables it: %o", (disabled) => {
    light();
    mocks.quality.mockReturnValue({ ...quality, ...disabled, enabled: false });
    const { container } = render(<ImmersiveHero subtitle="副标题" />);
    expect(mocks.aurora).not.toHaveBeenCalled();
    expect(container.querySelector(".hero-light-static")).not.toBeNull();
    expect(container.querySelector(".hero-light-atmosphere")?.getAttribute("data-ready")).toBe("false");
  });

  it("waits for a new successful frame after the quality gate is re-enabled", () => {
    light();
    const { container, rerender } = render(<ImmersiveHero subtitle="副标题" />);
    act(() => mocks.aurora.mock.lastCall![0].onReadyChange(true));
    mocks.quality.mockReturnValue({ ...quality, enabled: false, reducedMotion: true });
    rerender(<ImmersiveHero subtitle="副标题" />);
    expect(container.querySelector("[data-aurora]")).toBeNull();
    mocks.quality.mockReturnValue(quality);
    rerender(<ImmersiveHero subtitle="副标题" />);
    expect(container.querySelector("[data-aurora]")).not.toBeNull();
    expect(container.querySelector(".hero-light-atmosphere")?.getAttribute("data-ready")).toBe("false");
  });

  it("leaves the dark Galaxy branch and its existing parameters untouched", () => {
    mocks.quality.mockReturnValue(quality);
    const { container } = render(<ImmersiveHero subtitle="副标题" />);
    expect(mocks.aurora).not.toHaveBeenCalled();
    expect(mocks.galaxy).toHaveBeenCalledWith(expect.objectContaining({
      starSpeed: 0.4, glowIntensity: 0.5, rotationSpeed: 0.05, dpr: 1.5,
    }));
    expect(container.querySelector("[data-galaxy]")?.parentElement?.className).toContain("opacity-[0.22]");
    expect(container.querySelector(".hero-light-atmosphere")).toBeNull();
  });

  it("retains the original dark static fallback when WebGL is disabled", () => {
    mocks.quality.mockReturnValue({ ...quality, enabled: false });
    const { container } = render(<ImmersiveHero subtitle="副标题" />);
    expect(mocks.aurora).not.toHaveBeenCalled();
    expect(mocks.galaxy).not.toHaveBeenCalled();
    expect(container.querySelector(".hero-light-atmosphere")).toBeNull();
    expect(container.querySelector(".hero-atmosphere-field")?.innerHTML).toContain("radial-gradient");
  });
});

describe("ImmersiveHero", () => {
  it("keeps the Chinese pun in aria-label once and hides the glyph copy", () => {
    const title = "全栈的栈，也是栈桥的栈";
    render(<ImmersiveHero title={title} subtitle="副标题" />);
    const h1 = document.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1?.getAttribute("aria-label")).toBe(title);
    expect(h1?.querySelector(".sr-only")).toBeNull();
    expect(h1?.querySelector("[aria-hidden='true']")).not.toBeNull();
    expect(h1?.outerHTML.match(/全栈的栈/g)).toEqual([title.slice(0, 4)]);
    expect(h1?.textContent?.includes(`${title}${title}`)).toBe(false);
  });

  it("keeps the English title in aria-label once", () => {
    const title = "A pier has to hold at both ends";
    render(<ImmersiveHero title={title} subtitle="sub" />);
    const h1 = document.querySelector("h1");
    expect(h1?.getAttribute("aria-label")).toBe(title);
    expect(h1?.outerHTML.match(/A pier has to hold/g)).toHaveLength(1);
    expect(h1?.querySelector(".hero-cjk-punct")).toBeNull();
  });

  it("defaults to the Chinese pun when no title prop is passed", () => {
    render(<ImmersiveHero subtitle="副标题" />);
    const h1 = document.querySelector("h1");
    expect(h1?.getAttribute("aria-label")).toBe("全栈的栈，也是栈桥的栈");
  });

  it("marks the fullwidth comma so CSS can center it between neighboring glyphs", () => {
    render(<ImmersiveHero subtitle="副标题" />);
    const punct = document.querySelector(".hero-cjk-punct");
    expect(punct?.textContent).toBe("，");
    expect(document.querySelectorAll(".hero-cjk-punct")).toHaveLength(1);
  });

  it("gives the Chinese subtitle a line long enough to stay on one row", () => {
    render(
      <ImmersiveHero subtitle="一头连着采集管线与事件去重，一头连着你眼前这块屏幕。中间那段路，我自己走完。" />,
    );
    const wrap = document.querySelector(".hero-subtitle");
    expect(wrap?.className).toContain("max-w-[52rem]");
    expect(wrap?.className).not.toContain("max-w-2xl");
  });
});
