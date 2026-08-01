/**
 * Speculation Rules API — Chrome/Edge 原生預渲染。
 * hover/mousedown 站內鏈接時，瀏覽器在後台完整預渲染目標頁，
 * 點擊時直接切換（0ms 感知延遲）。
 * 不支持的瀏覽器安全忽略此 script 標籤。
 *
 * moderate = hover 200ms 或 mousedown 時觸發。
 * 排除帶 # 的錨點跳轉和外部鏈接（where 只匹配同源相對路徑）。
 */
export function SpeculationRules() {
  const rules = {
    prerender: [
      {
        where: {
          and: [
            { href_matches: "/*" },
            { not: { href_matches: "/api/*" } },
            { not: { selector_matches: "[target=_blank]" } },
          ],
        },
        eagerness: "moderate",
      },
    ],
  };

  return (
    <script
      type="speculationrules"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(rules) }}
    />
  );
}
