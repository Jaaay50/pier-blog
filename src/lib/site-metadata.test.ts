import { describe, expect, it } from "vitest";
import { localizedMetadata, pageJsonLd, SITE_URL } from "./site-metadata";

describe("localizedMetadata", () => {
  it("emits bilingual canonical, hreflang, Open Graph and Twitter tags for About", () => {
    const zh = localizedMetadata("zh", "about");
    const en = localizedMetadata("en", "about");

    expect(zh.alternates).toEqual({
      canonical: `${SITE_URL}/zh/about`,
      languages: {
        en: `${SITE_URL}/en/about`,
        zh: `${SITE_URL}/zh/about`,
        "x-default": `${SITE_URL}/en/about`,
      },
    });
    expect(en.alternates?.canonical).toBe(`${SITE_URL}/en/about`);
    expect(zh.openGraph).toMatchObject({
      title: "关于我 — Pier",
      url: `${SITE_URL}/zh/about`,
      locale: "zh_CN",
      type: "website",
    });
    expect(en.openGraph).toMatchObject({
      title: "About Me — Pier",
      url: `${SITE_URL}/en/about`,
      locale: "en_US",
    });
    expect(zh.twitter).toMatchObject({
      card: "summary_large_image",
      title: "关于我 — Pier",
    });
  });

  it("keeps home canonical on the locale root", () => {
    const zh = localizedMetadata("zh", "home");
    expect(zh.alternates?.canonical).toBe(`${SITE_URL}/zh`);
    expect(zh.alternates).toEqual(
      expect.objectContaining({
        languages: {
          en: `${SITE_URL}/en`,
          zh: `${SITE_URL}/zh`,
          "x-default": `${SITE_URL}/en`,
        },
      }),
    );
  });
});

describe("pageJsonLd", () => {
  it("uses ProfilePage for About and CollectionPage for blog", () => {
    expect(pageJsonLd("zh", "about")).toMatchObject({
      "@type": "ProfilePage",
      name: "关于我 — Pier",
      url: `${SITE_URL}/zh/about`,
      inLanguage: "zh-CN",
    });
    expect(pageJsonLd("en", "blog")).toMatchObject({
      "@type": "CollectionPage",
      name: "Tides — Pier",
      url: `${SITE_URL}/en/blog`,
      inLanguage: "en-US",
    });
    expect(pageJsonLd("zh", "blog").name).toBe("潮聲 — Pier");
  });
});
