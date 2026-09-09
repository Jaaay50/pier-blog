// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LabGallery } from "./LabGallery";
import { LAB_DEMOS } from "./lab-demos";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => {
    const t = (key: string) => {
      const parts = key.split(".");
      if (parts[2] === "stillAlt") return `${parts[1]}-alt`;
      return parts[parts.length - 1];
    };
    return t;
  }),
}));

vi.mock("./LabDemoEnhance", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- Mirrors the SSR poster contract.
  LabDemoEnhance: ({ still, alt }: { still: string; alt: string }) => <img src={still} alt={alt} />,
}));

describe("LabGallery", () => {
  it("SSRs ordered figures with titles and posters, without explanatory copy", async () => {
    render(await LabGallery());
    const figures = document.querySelectorAll("figure");
    expect(figures).toHaveLength(LAB_DEMOS.length);
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(LAB_DEMOS.length);
    for (const img of images) {
      expect(img.getAttribute("src")?.endsWith(".webp")).toBe(true);
    }
    expect(screen.queryByText("layer")).toBeNull();
    expect(screen.queryByText("desc")).toBeNull();
    expect(screen.queryByText("tech")).toBeNull();
    expect(screen.getAllByText("title")).toHaveLength(LAB_DEMOS.length);
    const alts = images.map((img) => img.getAttribute("alt"));
    expect(alts).toEqual(LAB_DEMOS.map((demo) => `${demo.id}-alt`));
    expect(new Set(alts).size).toBe(LAB_DEMOS.length);
  });
});
