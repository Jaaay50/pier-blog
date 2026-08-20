// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LabTeaser } from "./LabTeaser";

vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="shader-mixer" />,
}));

vi.mock("motion/react", () => ({
  motion: {
    div: (props: React.ComponentProps<"div"> & Record<string, unknown>) => {
      const elementProps = { ...props };
      delete elementProps.initial;
      delete elementProps.animate;
      delete elementProps.whileHover;
      delete elementProps.transition;
      return <div {...elementProps} />;
    },
  },
  useInView: () => true,
}));

vi.mock("@/lib/webgl", () => ({
  useWebGLQuality: () => ({
    enabled: false,
    reducedMotion: false,
    tier: "medium",
  }),
}));

vi.mock("@/components/TransitionLink", () => ({
  TransitionLink: ({ children, href, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/components/MagneticWrapper", () => ({
  MagneticWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserver {
      observe() {}
      disconnect() {}
    },
  );
});

describe("LabTeaser layout", () => {
  it("keeps the canvas edge-to-edge while the glass card stays in safe gutters", () => {
    const { container } = render(<LabTeaser label="Explore experiments" enterLab="Enter" />);
    const section = container.querySelector("section");
    const canvasHost = section?.querySelector(":scope > div.absolute.inset-0");
    const glass = section?.querySelector(".glass-card");

    expect(section?.className).toContain("site-content-no-px");
    expect(section?.style.maxWidth).toBe("");
    expect(section?.style.paddingLeft).toBe("");
    expect(section?.style.paddingRight).toBe("");
    expect(section?.className).toContain("overflow-hidden");
    expect(section?.className).toContain("rounded-2xl");
    expect(canvasHost).not.toBeNull();

    expect(glass?.className).toContain(
      "left-[max(1.5rem,env(safe-area-inset-left))]",
    );
    expect(glass?.className).toContain(
      "right-[max(1.5rem,env(safe-area-inset-right))]",
    );
    expect(glass?.className).toContain("w-auto");
    expect(glass?.className).toContain("max-w-sm");
    expect(glass?.className).toContain("md:left-auto");
    expect(glass?.className).toContain(
      "md:right-[max(3rem,env(safe-area-inset-right))]",
    );
  });
});
