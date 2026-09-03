import { describe, expect, it } from "vitest";
import { SITE_URL, buildMetadata, formatPageTitle, pageMetadata } from "./metadata";

describe("formatPageTitle", () => {
  it("appends the Pier suffix once", () => {
    expect(formatPageTitle("船塢")).toBe("船塢 — Pier");
    expect(formatPageTitle("Lab — Pier")).toBe("Lab — Pier");
    expect(formatPageTitle("Pier — Full-Stack Engineer · AI-Native Products")).toBe(
      "Pier — Full-Stack Engineer · AI-Native Products",
    );
  });
});

describe("buildMetadata", () => {
  it("emits a complete zh Open Graph / Twitter / canonical set for /lab", () => {
    const meta = buildMetadata({
      locale: "zh",
      title: "船塢",
      description: "六个从零手写的交互实验。",
      path: "/lab",
    });

    expect(meta.title).toBe("船塢 — Pier");
    expect(meta.description).toBe("六个从零手写的交互实验。");
    expect(meta.alternates).toEqual({
      canonical: `${SITE_URL}/zh/lab`,
      languages: {
        en: `${SITE_URL}/en/lab`,
        zh: `${SITE_URL}/zh/lab`,
        "x-default": `${SITE_URL}/en/lab`,
      },
    });
    expect(meta.openGraph).toMatchObject({
      type: "website",
      url: `${SITE_URL}/zh/lab`,
      title: "船塢 — Pier",
      description: "六个从零手写的交互实验。",
      siteName: "Pier",
      locale: "zh_CN",
      images: [{ url: `${SITE_URL}/og?type=site`, width: 1200, height: 630 }],
    });
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: "船塢 — Pier",
      description: "六个从零手写的交互实验。",
      images: [`${SITE_URL}/og?type=site`],
    });
  });

  it("keeps the home canonical on the locale root and preserves Pier-first titles", () => {
    const meta = buildMetadata({
      locale: "zh",
      title: "Pier — 全栈工程师 · AI 原生产品",
      description: "记录 AI 原生产品、全栈工程、数据管线与 Web 构建实践的个人博客与作品集。",
      path: "",
    });
    expect(meta.title).toBe("Pier — 全栈工程师 · AI 原生产品");
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/zh`);
    expect(meta.openGraph).toMatchObject({
      url: `${SITE_URL}/zh`,
      locale: "zh_CN",
      title: "Pier — 全栈工程师 · AI 原生产品",
    });
  });

  it("writes article times and a custom image without inheriting parent fields", () => {
    const image = `${SITE_URL}/og?type=blog&locale=zh&slug=a-post`;
    const meta = buildMetadata({
      locale: "en",
      title: "A post",
      description: "Hello",
      path: "/blog/a-post",
      image,
      type: "article",
      publishedTime: "2026-08-01",
      modifiedTime: "2026-08-02",
      tags: ["AI"],
    });
    expect(meta.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-08-01",
      modifiedTime: "2026-08-02",
      tags: ["AI"],
      images: [{ url: image, width: 1200, height: 630 }],
      locale: "en_US",
    });
    expect(meta.twitter).toMatchObject({
      title: "A post — Pier",
      images: [image],
    });
  });

  it("pageMetadata coerces unknown locales to en", () => {
    const meta = pageMetadata("fr", { title: "Lab", description: "x", path: "/lab" });
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/en/lab`);
    expect(meta.openGraph).toMatchObject({ locale: "en_US" });
  });
});
