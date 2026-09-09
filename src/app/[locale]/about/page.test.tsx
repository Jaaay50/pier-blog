// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";
import AboutPage from "./page";

const mocks = vi.hoisted(() => ({ locale: "zh" }));
vi.mock("next-intl/server", () => ({
  setRequestLocale: (locale: string) => { mocks.locale = locale; },
  getTranslations: async () => (key: string) => {
    const source = mocks.locale === "zh" ? zh : en;
    return key.split(".").reduce<unknown>((value, part) => (value as Record<string, unknown>)[part], source.about) as string;
  },
}));
vi.mock("@/components/Navbar", () => ({ Navbar: () => <nav /> }));
vi.mock("@/components/SiteFooter", () => ({ SiteFooter: () => <footer /> }));
vi.mock("@/components/webgl/FluidBackground", () => ({ FluidBackground: () => null }));
vi.mock("@/components/reactbits/SpotlightCard", () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/ExperienceJourney", () => ({
  ExperienceJourney: ({ title, experiences }: { title: string; experiences: { title: string; description: string }[] }) => (
    <section><h2>{title}</h2>{experiences.map((experience) => <p key={experience.title}>{experience.description}</p>)}</section>
  ),
}));
vi.mock("@/components/viz/SkillRadar", () => ({ SkillRadar: () => null }));
vi.mock("@/components/viz/ActivityHeatmap", () => ({ ActivityHeatmap: () => null }));
vi.mock("@/lib/posts", () => ({ getAllPosts: () => [] }));

beforeEach(() => { mocks.locale = "zh"; });
afterEach(cleanup);

describe("AboutPage content boundaries", () => {
  it.each(["zh", "en"])("preserves %s biography and project copy outside the title, without contact helper text", async (locale) => {
    const messages = locale === "zh" ? zh : en;
    const { container } = render(await AboutPage({ params: Promise.resolve({ locale }) }));
    expect(screen.getAllByText(messages.about.intro)).toHaveLength(1);
    expect(screen.getByText(messages.about.intro).closest("header")).toBeNull();
    expect(container.querySelector("header")?.textContent).not.toContain(messages.about.intro);
    expect(screen.getByText(messages.about.cloudborneDescription)).toBeTruthy();
    expect(screen.getByText(messages.about.experiences.role1Desc)).toBeTruthy();
    expect(screen.queryByText(messages.about.contactPrompt)).toBeNull();
    expect(screen.getByRole("link", { name: messages.about.sendEmail }).getAttribute("href")).toBe("mailto:ethan_pier@icloud.com");
  });
});
