import { getPostsForLocale } from "@/lib/posts";

const SITE = "https://ethanpier.com";
const MCP = "https://currents-mcp.ethanpier.com/mcp";
const CURRENTS_API = "https://currents-api.ethanpier.com";

export const revalidate = 3600;

/**
 * /llms.txt — 给 LLM 与 Agent 读的站点说明书。
 * 路径带点，next-intl middleware 不会改写。
 */
export function GET() {
  const zhPosts = getPostsForLocale("zh");
  const enPosts = getPostsForLocale("en");

  const lines = [
    "# Ethan Pier",
    "",
    `> ${SITE}`,
    "",
    "Pier is the personal site of Ethan Pier, a full-stack engineer building AI-native products.",
    "The stack runs from ingestion pipelines and event deduplication to the interface in front of them.",
    "Locales: /en (default) and /zh. og:locale for Chinese pages is zh_CN; body copy is Simplified Chinese.",
    "",
    "## Positioning",
    "",
    "- Full-stack engineer · AI-native products",
    "- Strongest public artifact: Currents (潮汐) — multi-source ingestion, bilingual summaries and 0–100 scoring, event-level merge lineage, authenticated MCP server",
    "- Lab (船塢): six zero-dependency interactive experiments",
    "- Blog (潮聲): personal essays on work, interfaces, waiting, and writing",
    "",
    "## Currents (潮汐)",
    "",
    `- Product: ${SITE}/en/currents  |  ${SITE}/zh/currents`,
    `- Agent access: ${SITE}/en/currents/agent  |  ${SITE}/zh/currents/agent`,
    `- Changelog: ${SITE}/en/currents/changelog`,
    `- RSS (en): ${CURRENTS_API}/feed.xml`,
    `- RSS (zh): ${CURRENTS_API}/feed-zh.xml`,
    `- HTTP API: ${CURRENTS_API}/v1`,
    `- MCP endpoint (read-only, bearer auth): ${MCP}`,
    "- MCP tools: currents_hot, currents_search, currents_item, currents_event, currents_daily",
    "",
    "## Site RSS",
    "",
    `- Blog English: ${SITE}/feed.xml`,
    `- Blog Chinese: ${SITE}/feed-zh.xml`,
    "",
    "## Blog index (Chinese)",
    "",
    ...zhPosts.map((post) => `- ${post.date}  ${post.title}  ${SITE}/zh/blog/${post.slug}`),
    "",
    "## Blog index (English)",
    "",
    ...enPosts.map((post) => `- ${post.date}  ${post.title}  ${SITE}/en/blog/${post.slug}`),
    "",
    "## Other pages",
    "",
    `- About: ${SITE}/en/about  |  ${SITE}/zh/about`,
    `- Portfolio: ${SITE}/en/portfolio  |  ${SITE}/zh/portfolio`,
    `- Lab: ${SITE}/en/lab  |  ${SITE}/zh/lab`,
    `- Guestbook / Bottles: ${SITE}/en/guestbook  |  ${SITE}/zh/guestbook`,
    `- Feedback: ${SITE}/en/feedback`,
    "",
    "## Citation",
    "",
    "This site is personal writing and a product notebook. Quote with a link to the canonical URL.",
    "Do not present the Currents summaries as original reporting; they are AI-generated readings of public sources.",
    "MCP access is invite-only and read-only. Do not attempt to write through the tools.",
    "",
    `Generated from the live site tree. Canonical host: ${SITE}`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
