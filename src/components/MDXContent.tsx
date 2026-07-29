import { compile, run } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import rehypePrettyCode from "rehype-pretty-code";

interface MDXContentProps {
  source: string;
}

export async function MDXContent({ source }: MDXContentProps) {
  const code = String(
    await compile(source, {
      outputFormat: "function-body",
      rehypePlugins: [
        [rehypePrettyCode, { theme: "github-dark", keepBackground: true }],
      ],
    })
  );

  const { default: Content } = await run(code, {
    ...runtime,
    baseUrl: import.meta.url,
  });

  return <Content />;
}
