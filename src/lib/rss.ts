import { getPostsForLocale } from "@/lib/posts";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

const SITE_URL = "https://ethanpier.com";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** CDATA 内不允许出现 "]]>"，按 W3C 惯例拆分转义 */
function escapeCdata(str: string): string {
  return str.replace(/\]\]>/g, "]]]]><![CDATA[>");
}

const mdProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeStringify);

/** 正文 markdown → RSS 全文 HTML（阅读器端渲染，不带站内样式） */
async function renderContentHtml(markdown: string): Promise<string> {
  const file = await mdProcessor.process(markdown);
  return String(file);
}

const channelMeta = {
  en: {
    title: "Ethan Pier — Blog",
    description:
      "Writing about frontend engineering, motion design, and modern web development.",
    language: "en-US",
    feedPath: "feed.xml",
  },
  zh: {
    title: "Ethan Pier — 博客",
    description: "关于前端工程、动效设计与现代 Web 开发的写作。",
    language: "zh-CN",
    feedPath: "feed-zh.xml",
  },
} as const;

export async function buildRssFeed(locale: "en" | "zh"): Promise<string> {
  const posts = getPostsForLocale(locale);
  const meta = channelMeta[locale];
  const now = new Date().toUTCString();

  const items = await Promise.all(
    posts.map(async (post) => {
      const url = `${SITE_URL}/${locale}/blog/${post.slug}`;
      const pubDate = new Date(post.date).toUTCString();
      const categories = post.tags
        .map((tag) => `      <category>${escapeXml(tag)}</category>`)
        .join("\n");
      const contentHtml = await renderContentHtml(post.content);

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.description)}</description>
      <content:encoded><![CDATA[${escapeCdata(contentHtml)}]]></content:encoded>
${categories}
    </item>`;
    })
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(meta.title)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(meta.description)}</description>
    <language>${meta.language}</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${SITE_URL}/${meta.feedPath}" rel="self" type="application/rss+xml"/>
${items.join("\n")}
  </channel>
</rss>
`;
}
