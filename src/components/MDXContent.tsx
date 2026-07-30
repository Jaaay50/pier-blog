import { compile, run } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import type { ReactElement } from "react";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

interface MDXContentProps {
  source: string;
}

interface MDXResult {
  content: ReactElement;
  headings: Heading[];
}

/**
 * 提取 h2/h3 headings 的 rehype 插件
 */
function rehypeExtractHeadings(headings: Heading[]) {
  return () => (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "h2" || node.tagName === "h3") {
        const id = node.properties?.id as string | undefined;
        const text = node.children
          .filter((child): child is { type: "text"; value: string } => child.type === "text")
          .map((child) => child.value)
          .join("");

        if (id && text) {
          headings.push({
            id,
            text,
            level: node.tagName === "h2" ? 2 : 3,
          });
        }
      }
    });
  };
}

export async function compileMDXWithHeadings(
  source: string
): Promise<MDXResult> {
  const headings: Heading[] = [];

  const code = String(
    await compile(source, {
      outputFormat: "function-body",
      rehypePlugins: [
        rehypeSlug,
        [rehypePrettyCode, { theme: "github-dark", keepBackground: true }],
        rehypeExtractHeadings(headings),
      ],
    })
  );

  const { default: Content } = await run(code, {
    ...runtime,
    baseUrl: import.meta.url,
  });

  return { content: <Content />, headings };
}

/**
 * 旧的 MDXContent 组件（向后兼容，不返回 headings）
 */
export async function MDXContent({ source }: MDXContentProps) {
  const { content } = await compileMDXWithHeadings(source);
  return content;
}
