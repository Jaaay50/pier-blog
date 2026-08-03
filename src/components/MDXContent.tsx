import { compile, run } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import type { ReactElement } from "react";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";
import { Callout } from "@/components/mdx/Callout";
import { CodeBlockWrapper } from "@/components/mdx/CodeBlockWrapper";

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
      className="not-prose my-6 border-l-[3px] border-[var(--border-hover)] bg-[var(--bg-card)] px-5 py-4 text-sm italic leading-relaxed text-[var(--text-secondary)] [&>p]:m-0"
    />
  ),
  // 代码块：包一层 client wrapper 注入复制按钮（pre 本身仍是 SSR 产物）
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <CodeBlockWrapper>
      <pre {...props} />
    </CodeBlockWrapper>
  ),
};

/** mdast 阶段注入 meta（remark 插件）：默认给所有 fenced code block 加 showLineNumbers */
function remarkInjectLineNumbers() {
  return (tree: unknown) => {
    const mdast = tree as { children?: unknown[] };
    const walk = (n: unknown) => {
      if (!n || typeof n !== "object") return;
      const node = n as { type?: string; meta?: string | null; children?: unknown[] };
      if (node.type === "code") {
        node.meta = node.meta ?? "";
        if (!node.meta.includes("showLineNumbers")) {
          node.meta = `${node.meta} showLineNumbers`.trim();
        }
      }
      node.children?.forEach(walk);
    };
    mdast.children?.forEach(walk);
  };
}

export async function compileMDXWithHeadings(
  source: string
): Promise<MDXResult> {
  const headings: Heading[] = [];

  const code = String(
    await compile(source, {
      outputFormat: "function-body",
      remarkPlugins: [remarkInjectLineNumbers],
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
