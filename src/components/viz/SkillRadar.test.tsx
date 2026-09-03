// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillRadar } from "./SkillRadar";

vi.mock("motion/react", () => ({
  motion: {
    g: ({ children, ...props }: React.ComponentProps<"g">) => <g {...props}>{children}</g>,
    circle: (props: React.ComponentProps<"circle">) => <circle {...props} />,
  },
  useInView: () => true,
}));

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

afterEach(() => {
  cleanup();
});

const SEVEN_AXES = [
  { label: "前端", value: 92 },
  { label: "后端", value: 84 },
  { label: "数据与管线", value: 90 },
  { label: "AI 工程", value: 82 },
  { label: "动效", value: 88 },
  { label: "设计", value: 75 },
  { label: "性能", value: 86 },
];

describe("SkillRadar", () => {
  it("renders seven bilingual-ready axes without dropping labels", () => {
    const { container } = render(<SkillRadar axes={SEVEN_AXES} />);
    const labels = container.querySelectorAll("svg text");
    expect(labels).toHaveLength(7);
    expect([...labels].map((node) => node.textContent)).toEqual(
      SEVEN_AXES.map((axis) => axis.label),
    );
    expect(container.querySelector("svg")?.getAttribute("aria-label")).toContain("数据与管线 90");
  });
});
