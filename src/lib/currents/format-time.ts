/**
 * 事件页时间格式化：固定产品指定时区 Asia/Hong_Kong。
 *
 * 根因：Vercel 构建/SSR 环境为 UTC，桥与主要读者在 UTC+8。若用运行环境
 * 本地时区，服务器渲染的 HTML 与浏览器 hydration 输出不同，触发 hydration
 * mismatch。固定时区后，任何 TZ 下同一 ISO 字符串输出同一文本。
 * （与 changelog/page.tsx 的既定约定一致。）
 */
export function fmtDateTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    timeZone: "Asia/Hong_Kong",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
