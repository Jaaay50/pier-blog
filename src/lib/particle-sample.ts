/**
 * Hero 粒子采样契约：只从当前标题的字形取样。
 * 跨语言残影（中文标题里冒出拉丁字母）来自多采了不该在场的 span，
 * 或 offscreen canvas 没清空。这里把「允许的墨水」收成纯函数，供采样与测试共用。
 */

export function titleGlyphSet(title: string): Set<string> {
  return new Set(Array.from(title));
}

/** 空格与不换行空格是英文词间距，不算外来字形。 */
export function isSpacingGlyph(glyph: string): boolean {
  return glyph === "" || glyph === " " || glyph === "\u00a0";
}

export function glyphBelongsToTitle(title: string, glyph: string): boolean {
  if (isSpacingGlyph(glyph)) return true;
  return titleGlyphSet(title).has(glyph);
}

export function collectSampleSource(anchor: HTMLElement): string {
  return Array.from(anchor.querySelectorAll("[data-ptchar]"))
    .map((node) => node.textContent ?? "")
    .join("");
}

/**
 * 采样源必须是当前标题的子集。中文标题里出现 Latin 字母即失败。
 * 允许标题自身含有的字符（英文标题的 T、中文标题里的逗号）。
 */
export function sampleSourceAllowed(title: string, sourceText: string): boolean {
  const allowed = titleGlyphSet(title);
  for (const glyph of Array.from(sourceText)) {
    if (isSpacingGlyph(glyph)) continue;
    if (!allowed.has(glyph)) return false;
  }
  return true;
}

export function hasUnexpectedLatin(title: string, sourceText: string): boolean {
  const titleHasLatin = /[A-Za-z]/.test(title);
  if (titleHasLatin) return false;
  return /[A-Za-z]/.test(sourceText);
}
