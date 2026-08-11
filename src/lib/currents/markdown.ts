import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

type Schema = typeof defaultSchema;

/**
 * 最小允许 HTML schema：只保留 Currents 深度解读/翻译实际需要的标签。
 *
 * 允许：段落/标题/列表/引用/代码/表格/强调/删除线/链接/换行
 * 拒绝：script/style/iframe/object/embed/form/input/svg/math 等一切主动内容
 * 链接协议仅允许 http/https/mailto；相对路径与 # 锚点天然放行；
 * javascript:/data:/vbscript:/协议混淆（大小写、空白、控制字符）由
 * hast-util-sanitize 在 AST 层解析后按协议白名单拒绝，不依赖字符串正则。
 */
const safeSchema: Schema = {
  ...defaultSchema,
  tagNames: [
    // 块级
    "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "blockquote",
    "pre", "code",
    "br", "hr",
    // 内联
    "strong", "em", "del", "a",
    // 表格（GFM）
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  attributes: {
    a: ["href", "title"],
    // 代码块语言类：仅允许 language- 前缀，避免任意 className 注入
    code: [["className", /^language-[\w-]+$/]],
    ol: ["start"],
    th: ["align"],
    td: ["align"],
    // 无全局属性：不允许 id/style/on*/data-* 等
    "*": [],
  },
  protocols: {
    href: ["http", "https", "mailto"],
  },
  // 命中即整体丢弃内容（默认 strip 已含 script；显式列出便于审计）
  strip: ["script", "style"],
  // 不允许任何注释
  allowComments: false,
  allowDoctypes: false,
};

/**
 * 后台 LLM 产出的 Markdown → 安全 HTML。
 *
 * 管线：Markdown → mdast → hast → sanitize（AST 层白名单清洗）→ HTML 字符串。
 * 即使后台被攻破或 LLM 产出被投毒，输出也不含可执行内容。
 *
 * 服务端（ISR 详情页）与客户端（CurrentsReader 阅读层）共用此唯一入口。
 */
export async function renderMarkdown(md: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, safeSchema)
    .use(rehypeStringify)
    .process(md);
  return String(file);
}
