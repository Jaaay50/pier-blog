/**
 * 把结构化数据安全序列化为可嵌入 <script type="application/ld+json"> 的 JSON 字符串。
 *
 * 防护目标（外部不可信内容：RSS 标题、作者名、摘要等）：
 * - `</script>` / `<!--` / `<script` 闭合逃逸：`<` `>` 统一转义为 \u003c \u003e；
 * - HTML 注释/实体逃逸：`&` 转义为 \u0026；
 * - 行分隔符：U+2028 / U+2029 转义为 \u2028 \u2029（旧引擎中它们是行终止符，会打断字符串字面量）；
 * - 控制字符 DEL 附近与单引号保持原样（JSON 字符串语义内安全）。
 *
 * 结果永远是合法 JSON，且不含任何可闭合 script 标签或改变 HTML 解析的原始字符。
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
