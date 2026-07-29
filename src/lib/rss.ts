import { getPostsForLocale } from "@/lib/posts";

const SITE_URL = "https://ethanpier.com";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const channelMeta = {
  en: {
    title: "Ethan Pier — Blog",
    description:
      "Writing about frontend engineering, motion design, and modern web development.",
    language: "en-US",
  },
  zh: {
    title: "Ethan Pier — 博客",
    description: "关于前端工程、动效设计与现代 Web 开发的写作。",
    language: "zh-CN",
  },
} as const;

export function buildRssFeed(locale: "en" | "zh"): string {
  const posts = getPostsForLocale(locale);
  const meta = channelMeta[locale];
  const now = new Date().toUTCString();

  const items = posts
    .map((post) => {
      const url = `${SITE_URL}/blog/${post.slug}`;
      const pubDate = new Date(post.date).toUTCString();
      const categories = post.tags
        .map((tag) => `      <category>${escapeXml(tag)}</category>`)
        .join("\n");

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.description)}</description>
${categories}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(meta.title)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(meta.description)}</description>
    <language>${meta.language}</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${SITE_URL}/${locale === "zh" ? "feed-zh.xml" : "feed.xml"}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}
