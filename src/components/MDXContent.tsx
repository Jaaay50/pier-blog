import { compile, run } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import type { ReactElement } from "react";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";
import { Callout } from "@/components/mdx/Callout";

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

/**
 * 自定义 MDX 组件映射
 * - Callout: 支持 type=info/tip/warning/danger 的标注块
 * - blockquote: 统一视觉样式
 */
const mdxComponents = {
  Callout,
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      {...props}
      className="not-prose my-6 border-l-[3px] border-[var(--accent)] bg-[var(--accent-soft)] px-5 py-4 text-sm italic leading-relaxed text-[var(--text-secondary)] [&>p]:m-0"
    />
  ),
};

export async function compileMDXWithHeadings(
  source: string
): Promise<MDXResult> {
  const headings: Heading[] = [];

  const code = String(
    await compile(source, {
      outputFormat: "function-body",
      rehypePlugins: [
        rehypeSlug,
        [
          rehypePrettyCode,
          {
            // 双主题：深色 / 浅色自动跟随 CSS class
            theme: {
              dark: "github-dark",
              light: "github-light",
            },
            keepBackground: true,
          },
        ],
        rehypeExtractHeadings(headings),
      ],
    })
  );

  const { default: Content } = await run(code, {
    ...runtime,
    baseUrl: import.meta.url,
  });

  return {
    content: <Content components={mdxComponents} />,
    headings,
  };
}

/**
 * 旧的 MDXContent 组件（向后兼容，不返回 headings）
 */
export async function MDXContent({ source }: MDXContentProps) {
  const { content } = await compileMDXWithHeadings(source);
  return content;
}
