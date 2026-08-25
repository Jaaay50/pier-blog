import type { Root, Text, Parent, PhrasingContent } from "mdast";
import type { VFile } from "vfile";

/**
 * CommonMark 在 CJK 标点相邻时无法闭合强调标记的补正插件。
 *
 * ## 根因
 *
 * CommonMark 用「左/右侧翼定界符串」(left/right-flanking delimiter run) 判断
 * `*` / `**` / `~~` 能否开启或闭合强调。右侧翼要求：
 *
 *   1. 定界符前不是空白；且
 *   2. 定界符前不是标点，**或者**定界符后是空白/标点。
 *
 * 中文正文里 `**来源事实：**报道` 恰好命中失败分支：闭合 `**` 前是全角冒号
 * `：`（Unicode 标点），后面紧跟汉字 `报`（在 CommonMark 分类中属于「字母」，
 * 既非空白也非标点）→ 不构成右侧翼 → 无法闭合 → `**` 原样输出为字面量。
 *
 * 同样的规则也会让 `**标签，**内容`、`**标签。**内容`、`*重点：*说明`、
 * `~~废弃：~~新版` 全部失效。而 `**未证实信息：**“洽谈中”` 却能正常渲染，
 * 只是因为其后的全角引号 `“` 恰好是标点，侥幸满足了条件 2。
 *
 * 这是规范行为，不是 remark 的缺陷：规范面向西文设计，CJK 标点与汉字的
 * 组合不在其设计考量内。上游生态的通行解法是 `remark-cjk-friendly`
 * （micromark 分类层扩展），但本项目明确要求不新增依赖，因此在 mdast
 * 层做一次等价补正。
 *
 * ## 安全边界
 *
 * 本插件只在 **解析已经放弃** 的位置补救：凡是 remark 正常识别的强调，
 * 早已是 `strong`/`emphasis`/`delete` 节点，根本不会以字面量文本进入这里。
 * 因此不存在与规范竞争的可能，只会把「本该加粗却没加粗」的残留补上。
 *
 * 三重防误伤：
 *
 * 1. **逐字节还原校验**：仅当文本节点的原始源码切片与解析后的值完全一致时
 *    才处理。只要出现反斜杠转义（`\*\*`）或字符实体（`&ast;`），二者必然
 *    不等，直接跳过，保持现状。这从根本上杜绝了把 `\*\*不加粗\*\*` 误判为
 *    加粗的风险。
 * 2. **空白侧翼约束**：开定界符后、闭定界符前均不得为空白，`2 ** 3 and 4 ** 5`
 *    与 glob 形式的裸星号（如双星斜杠通配）不会被匹配。
 * 3. **CJK 语境约束**：只有内容或紧邻字符含 CJK 字符时才补正，纯西文文本
 *    的解析结果完全不受影响。
 *
 * 代码块、行内代码与原始 HTML 在 mdast 中不是 `text` 节点，天然不受影响。
 */

/** CJK 汉字、假名、全角标点与 CJK 符号区。 */
const CJK_PATTERN =
  /[\u1100-\u11ff\u2e80-\u2eff\u3000-\u303f\u3040-\u30ff\u3130-\u318f\u3400-\u4dbf\u4e00-\u9fff\ua960-\ua97f\uac00-\ud7ff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/;

type EmphasisType = "strong" | "emphasis" | "delete";

interface MarkerRule {
  type: EmphasisType;
  /** 捕获组 1 为定界符之间的内容。 */
  pattern: RegExp;
}

/**
 * 匹配顺序即优先级：`**` 必须先于 `*`，否则 `**x**` 会被单星规则拆错。
 *
 * 通用约束（三条规则一致）：
 * - `(?!\s)` 开定界符后不得为空白；
 * - `(?<!\s)` 闭定界符前不得为空白；
 * - 内容非空且不含同种定界符，避免跨越多个强调段落贪婪匹配。
 */
const MARKER_RULES: readonly MarkerRule[] = [
  // **strong**：内容不得包含 `**`
  { type: "strong", pattern: /\*\*(?!\s)((?:(?!\*\*)[\s\S])+?)(?<!\s)\*\*/ },
  // ~~delete~~：内容不得包含 `~~`
  { type: "delete", pattern: /~~(?!\s)((?:(?!~~)[\s\S])+?)(?<!\s)~~/ },
  // *emphasis*：两侧均不得紧邻另一个 `*`，避免吃掉 `**` 的一半
  { type: "emphasis", pattern: /(?<!\*)\*(?!\s)((?:[^*])+?)(?<!\s)\*(?!\*)/ },
];

/** 判断该次匹配是否处于 CJK 语境（内容或紧邻字符含 CJK）。 */
function isCjkContext(value: string, match: RegExpExecArray): boolean {
  const content = match[1];
  const before = match.index > 0 ? value[match.index - 1] : "";
  const afterIndex = match.index + match[0].length;
  const after = afterIndex < value.length ? value[afterIndex] : "";

  return (
    CJK_PATTERN.test(content) ||
    CJK_PATTERN.test(before) ||
    CJK_PATTERN.test(after)
  );
}

/**
 * 把纯文本切分为 mdast 短语节点。
 *
 * 每次只处理第一个命中的定界符，剩余片段递归处理；由于 before/inner/after
 * 均严格短于输入，递归必然终止。
 */
function parseInline(value: string): PhrasingContent[] {
  if (!value) return [];

  for (const { type, pattern } of MARKER_RULES) {
    const match = pattern.exec(value);
    if (!match || !isCjkContext(value, match)) continue;

    const before = value.slice(0, match.index);
    const after = value.slice(match.index + match[0].length);
    const children = parseInline(match[1]);

    // 内容全为空白等退化情况：保持原样，不产出空强调节点
    if (children.length === 0) continue;

    return [
      ...parseInline(before),
      { type, children } as PhrasingContent,
      ...parseInline(after),
    ];
  }

  return [{ type: "text", value }];
}

/** 深度遍历所有具备 children 的节点。 */
function isParent(node: unknown): node is Parent {
  return (
    typeof node === "object" &&
    node !== null &&
    Array.isArray((node as Parent).children)
  );
}

/**
 * remark 插件：补正 CJK 标点导致的强调失效。
 *
 * 必须在 remark-parse（以及 remark-gfm，若启用）之后运行，
 * 只改写 mdast，不触碰解析阶段，也不影响 sanitize 边界。
 */
export function remarkCjkEmphasis() {
  return (tree: Root, file: VFile) => {
    const source = String(file.value);

    const walk = (node: Parent) => {
      let mutated = false;
      const next: PhrasingContent[] = [];

      for (const child of node.children) {
        if (child.type !== "text") {
          if (isParent(child)) walk(child);
          next.push(child as PhrasingContent);
          continue;
        }

        const text = child as Text;
        const start = text.position?.start?.offset;
        const end = text.position?.end?.offset;

        // 无位置信息（合成节点）无法做还原校验，保守跳过
        if (typeof start !== "number" || typeof end !== "number") {
          next.push(text);
          continue;
        }

        // 逐字节还原校验：源码切片与解析值必须完全一致。
        // 存在反斜杠转义或字符实体时二者不等，跳过以避免误判。
        if (source.slice(start, end) !== text.value) {
          next.push(text);
          continue;
        }

        const parsed = parseInline(text.value);
        if (parsed.length === 1 && parsed[0].type === "text") {
          next.push(text);
          continue;
        }

        mutated = true;
        next.push(...parsed);
      }

      if (mutated) node.children = next as Parent["children"];
    };

    walk(tree);
  };
}
