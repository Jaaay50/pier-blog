// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImmersiveHero } from "./ImmersiveHero";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  theme: vi.fn(), quality: vi.fn(), locale: vi.fn(), aurora: vi.fn(), galaxy: vi.fn(), particles: vi.fn(),
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

vi.mock("@/components/reactbits/ShinyText", () => ({
  default: ({ text, className }: { text: string; className: string }) => <span className={className}>{text}</span>,
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    if (loader.toString().includes("reactbits/Aurora")) {
      return function MockAurora(props: unknown) { mocks.aurora(props); return <canvas data-aurora />; };
    }
    if (loader.toString().includes("reactbits/Galaxy")) {
      return function MockGalaxy(props: unknown) { mocks.galaxy(props); return <canvas data-galaxy />; };
    }
    return function MockParticleTitle(props: unknown) { mocks.particles(props); return <canvas data-particles />; };
  },
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

  it.each([
    ["zh", zh.home.heroSubtitle, "max-w-[52rem]"],
    ["en", en.home.heroSubtitle, "max-w-2xl"],
  ])("restores the original %s subtitle without a replacement action", (locale, subtitle, widthClass) => {
    mocks.locale.mockReturnValue(locale);
    const { container } = render(<ImmersiveHero subtitle={subtitle} />);
    const wrap = container.querySelector(".hero-subtitle");
    expect(wrap?.textContent).toBe(subtitle);
    expect(wrap?.className).toContain(widthClass);
    expect(wrap?.querySelector("span")?.className).toContain("text-base");
    expect(container.querySelector("h1")).not.toBeNull();
    expect(container.querySelector("a, button")).toBeNull();
  });
});


describe("ImmersiveHero readable title handoff", () => {
  const quality = {
    enabled: true, reducedMotion: false, webglSupported: true,
    tier: "high", dpr: 1.5, particleMultiplier: 1, mouseInteraction: false,
  };
  const anchor = (container: HTMLElement) => container.querySelector<HTMLSpanElement>(".hero-title-ssr")!;

  afterEach(() => {
    document.documentElement.removeAttribute("data-particles-ready");
  });

  it("renders visible static title glyphs and subtitle in SSR without hidden or blurred entry styles", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<ImmersiveHero subtitle="全栈工程师" />);
    expect(anchor(container).style.opacity).toBe("");
    expect(anchor(container).getAttribute("data-hero-solid")).toBe("visible");
    expect(anchor(container).textContent).toBe("全栈的栈，也是栈桥的栈");
    expect(anchor(container).querySelector("[style]")).toBeNull();
    expect(container.querySelector(".hero-subtitle")?.getAttribute("initial")).toBeNull();
    expect(container.querySelector(".hero-subtitle")?.textContent).toBe("全栈工程师");
    expect(container.querySelector("[data-particles]")).toBeNull();
  });

  it("does not force inline opacity on the SSR anchor so ParticleGate CSS can hide it", () => {
    document.documentElement.setAttribute("data-particles-ready", "pending");
    const container = document.createElement("div");
    container.innerHTML = renderToString(<ImmersiveHero subtitle="全栈工程师" />);
    expect(anchor(container).getAttribute("style")).toBeNull();
    expect(anchor(container).className).toContain("hero-title-ssr");
  });

  it("retains the same anchor through hydration and hides glyphs once particles are expected", async () => {
    const element = <ImmersiveHero subtitle="全栈工程师" />;
    const container = document.createElement("div");
    container.innerHTML = renderToString(element);
    document.body.appendChild(container);
    const originalAnchor = anchor(container);
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => { root = hydrateRoot(container, element, { onRecoverableError }); });
      expect(anchor(container).style.opacity).toBe("");
      mocks.quality.mockReturnValue(quality);
      await act(async () => { root?.render(<ImmersiveHero subtitle="全栈工程师" />); });
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(anchor(container)).toBe(originalAnchor);
      expect(anchor(container).style.opacity).toBe("0");
      expect(anchor(container).getAttribute("data-hero-solid")).toBe("hidden");
      expect(container.querySelector("[data-particles]")).not.toBeNull();
      expect(mocks.particles.mock.lastCall![0].anchorRef.current).toBe(originalAnchor);
    } finally {
      await act(async () => { root?.unmount(); });
      container.remove();
    }
  });

  it("keeps the title hidden while particles are expected, including when readiness is revoked", () => {
    mocks.quality.mockReturnValue(quality);
    const { container } = render(<ImmersiveHero subtitle="全栈工程师" />);
    const originalAnchor = anchor(container);
    expect(originalAnchor.style.opacity).toBe("0");
    act(() => mocks.particles.mock.lastCall![0].onReadyChange(true));
    expect(anchor(container).style.opacity).toBe("0");
    act(() => mocks.particles.mock.lastCall![0].onReadyChange(false));
    expect(anchor(container)).toBe(originalAnchor);
    expect(originalAnchor.style.opacity).toBe("0");
    expect(originalAnchor.querySelector("[style]")).toBeNull();
  });

  it("restores the static anchor and unmounts particles after a render failure", () => {
    mocks.quality.mockReturnValue(quality);
    const { container } = render(<ImmersiveHero subtitle="全栈工程师" />);
    act(() => mocks.particles.mock.lastCall![0].onReadyChange(true));
    act(() => mocks.particles.mock.lastCall![0].onFail());
    expect(anchor(container).style.opacity).toBe("1");
    expect(anchor(container).getAttribute("data-hero-solid")).toBe("visible");
    expect(container.querySelector("[data-particles]")).toBeNull();
  });

  it("keeps the title visible when WebGL is disabled and hides it again when re-enabled", () => {
    mocks.quality.mockReturnValue(quality);
    const { container, rerender } = render(<ImmersiveHero subtitle="全栈工程师" />);
    act(() => mocks.particles.mock.lastCall![0].onReadyChange(true));
    mocks.quality.mockReturnValue({ ...quality, enabled: false });
    rerender(<ImmersiveHero subtitle="全栈工程师" />);
    expect(anchor(container).style.opacity).toBe("1");
    expect(container.querySelector("[data-particles]")).toBeNull();
    mocks.quality.mockReturnValue(quality);
    rerender(<ImmersiveHero subtitle="全栈工程师" />);
    expect(anchor(container).style.opacity).toBe("0");
    expect(container.querySelector("[data-particles]")).not.toBeNull();
  });

  it("arms ParticleGate on mount and clears it on fallback", () => {
    document.documentElement.setAttribute("data-particles-ready", "pending");
    mocks.quality.mockReturnValue(quality);
    const { rerender } = render(<ImmersiveHero subtitle="全栈工程师" />);
    expect(document.documentElement.getAttribute("data-particles-ready")).toBe("armed");
    act(() => mocks.particles.mock.lastCall![0].onReadyChange(true));
    expect(document.documentElement.getAttribute("data-particles-ready")).toBe("live");
    act(() => mocks.particles.mock.lastCall![0].onFail());
    expect(document.documentElement.hasAttribute("data-particles-ready")).toBe(false);
    mocks.quality.mockReturnValue({ ...quality, enabled: false });
    document.documentElement.setAttribute("data-particles-ready", "pending");
    rerender(<ImmersiveHero subtitle="全栈工程师" />);
    expect(document.documentElement.hasAttribute("data-particles-ready")).toBe(false);
  });

  it("does not apply the previous title's readiness or delayed callbacks to a new locale", () => {
    mocks.quality.mockReturnValue(quality);
    const { container, rerender } = render(<ImmersiveHero subtitle="全栈工程师" />);
    const staleCallbacks = mocks.particles.mock.lastCall![0];
    act(() => staleCallbacks.onReadyChange(true));
    mocks.locale.mockReturnValue("en");
    rerender(<ImmersiveHero subtitle="Full-Stack Engineer" />);
    expect(anchor(container).style.opacity).toBe("0");
    expect(container.querySelector("h1")?.getAttribute("aria-label")).toBe("A pier has to hold at both ends");
    act(() => { staleCallbacks.onReadyChange(true); staleCallbacks.onFail(); });
    expect(anchor(container).style.opacity).toBe("0");
    expect(container.querySelector("[data-particles]")).not.toBeNull();
    act(() => mocks.particles.mock.lastCall![0].onReadyChange(true));
    expect(anchor(container).style.opacity).toBe("0");
  });

  it("retries a failed title on locale change while keeping the new title hidden until particles draw", () => {
    mocks.quality.mockReturnValue(quality);
    const { container, rerender } = render(<ImmersiveHero subtitle="全栈工程师" />);
    act(() => mocks.particles.mock.lastCall![0].onFail());
    mocks.locale.mockReturnValue("en");
    rerender(<ImmersiveHero subtitle="Full-Stack Engineer" />);
    expect(anchor(container).style.opacity).toBe("0");
    expect(container.querySelector("[data-particles]")).not.toBeNull();
  });

  it("allows Chinese glyph wrapping while preserving emphasis and English word groups", () => {
    const { container, rerender } = render(<ImmersiveHero subtitle="全栈工程师" />);
    expect(anchor(container).querySelector(".whitespace-nowrap")).toBeNull();
    const glyphs = anchor(container).querySelectorAll("[data-ptchar]");
    expect(glyphs).toHaveLength(11);
    expect(glyphs[3].className).toContain("hero-stack-glyph");
    expect(glyphs[10].className).toContain("hero-stack-glyph");
    mocks.locale.mockReturnValue("en");
    rerender(<ImmersiveHero subtitle="Full-Stack Engineer" />);
    expect(anchor(container).querySelectorAll(".whitespace-nowrap")).toHaveLength(8);
    expect(anchor(container).querySelectorAll("[data-ptchar]")).toHaveLength(24);
  });
});
