// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LabGallery } from "./LabGallery";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => {
    const t = (key: string, values?: { title?: string }) => {
      if (key === "stillAlt") return `${values?.title ?? ""} still`;
      const parts = key.split(".");
      return parts[parts.length - 1];
    };
    return t;
  }),
}));

vi.mock("./LabDemoEnhance", () => ({
  LabDemoEnhance: () => <div data-testid="enhance" />,
}));

describe("LabGallery", () => {
  it("SSRs six figures with titles, layer copy, and still images", async () => {
    render(await LabGallery());
    const figures = document.querySelectorAll("figure");
    expect(figures).toHaveLength(6);
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(6);
    for (const img of images) {
      expect(img.getAttribute("src")?.endsWith(".webp")).toBe(true);
    }
    expect(screen.getAllByText("layer")).toHaveLength(6);
    expect(screen.getAllByText("title")).toHaveLength(6);
  });
});
