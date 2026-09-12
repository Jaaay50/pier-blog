// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTranslator } from "next-intl";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";
import { LabGallery } from "./LabGallery";
import { LAB_DEMOS } from "./lab-demos";

let locale: "zh" | "en" = "zh";
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => createTranslator({ locale, messages: locale === "zh" ? zh : en, namespace: "lab" })),
}));
vi.mock("./LabDemoEnhance", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- Mirrors the SSR poster contract.
  LabDemoEnhance: ({ still, alt }: { still: string; alt: string }) => <img src={still} alt={alt} />,
}));
afterEach(cleanup);

describe("LabGallery", () => {
  it.each(["zh", "en"] as const)("SSRs approved explanations and all sixteen posters in %s without a runtime", async (language) => {
    locale = language;
    render(await LabGallery());
    const figures = document.querySelectorAll("figure");
    const messages = language === "zh" ? zh.lab : en.lab;
    expect(figures).toHaveLength(16);
    expect(screen.getAllByRole("img")).toHaveLength(16);
    LAB_DEMOS.forEach((demo, index) => {
      const copy = messages.demos[demo.id];
      const figure = figures[index] as HTMLElement;
      expect(within(figure).getByRole("heading", { name: copy.title })).toBeTruthy();
      expect(within(figure).getByRole("img", { name: copy.stillAlt }).getAttribute("src")).toBe(demo.still);
      for (const field of ["desc", "layer", "tech"] as const) {
        expect(copy[field].trim().length).toBeGreaterThan(0);
        expect(within(figure).getByText(copy[field])).toBeTruthy();
      }
      expect(figure.querySelectorAll("figcaption p")).toHaveLength(3);
      expect(within(figure).getByText(copy.layer).className).toContain("text-base font-medium");
      expect(figure.textContent).not.toContain(`demos.${demo.id}.`);
    });
    expect(messages.metaDescription).toMatch(language === "zh" ? /^十六个/ : /^Sixteen/);
  });
});
