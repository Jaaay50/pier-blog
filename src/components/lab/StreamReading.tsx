"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { LabButton, LabToolbar } from "./LabControls";
import type { NewDemoProps } from "./new-demo-types";

const ZH_TEXT =
  "同一段回答可以逐字跳出、逐句落下，或整段出现。内容必须一致。阅读者不该被动画追着跑。";
const EN_TEXT =
  "The same answer can arrive a character at a time, a sentence at a time, or all at once. The words stay the same. The reader should not have to chase the animation.";

type Mode = "char" | "sentence" | "paragraph";

function units(text: string, mode: Mode, zh: boolean): string[] {
  if (mode === "paragraph") return [text];
  if (mode === "sentence") {
    return zh
      ? text.split(/(?<=。)/).filter(Boolean)
      : text.split(/(?<=\. )/).filter(Boolean);
  }
  return Array.from(text);
}

export default function StreamReading({ onReadyChange }: NewDemoProps) {
  const zh = useLocale() === "zh";
  const text = zh ? ZH_TEXT : EN_TEXT;
  const [mode, setMode] = useState<Mode>("char");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const parts = useMemo(() => units(text, mode, zh), [text, mode, zh]);
  const prefersReducedMotion = () =>
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    onReadyChange?.(true);
    return () => onReadyChange?.(false);
  }, [onReadyChange]);

  const applyMode = (value: Mode) => {
    setMode(value);
    setPlaying(false);
    setIndex(0);
  };

  useEffect(() => {
    if (!playing || index >= parts.length) return;
    const reduced = prefersReducedMotion();
    const delay = reduced ? 0 : mode === "char" ? 28 : mode === "sentence" ? 420 : 0;
    const timer = window.setTimeout(() => setIndex((value) => reduced ? parts.length : value + 1), delay);
    return () => window.clearTimeout(timer);
  }, [playing, index, parts.length, mode]);

  const shown = parts.slice(0, index).join("");
  const done = index >= parts.length;

  return (
    <div className="bg-[var(--bg-primary)]">
      <div className="min-h-48 px-5 py-6">
        <p className="max-w-xl text-base leading-relaxed text-[var(--text-primary)]" aria-live="polite">
          {shown || (zh ? "尚未开始。" : "Not started.")}
        </p>
      </div>
      <LabToolbar>
        {(["char", "sentence", "paragraph"] as const).map((value) => (
          <LabButton
            key={value}
            aria-pressed={mode === value}
            onClick={() => applyMode(value)}
          >
            {value === "char" ? (zh ? "逐字" : "Glyph") : value === "sentence" ? (zh ? "逐句" : "Sentence") : zh ? "整段" : "All at once"}
          </LabButton>
        ))}
        <LabButton onClick={() => {
          if (prefersReducedMotion()) { setIndex(parts.length); setPlaying(false); }
          else setPlaying((value) => !value);
        }} disabled={done}>
          {playing && !done ? (zh ? "暂停" : "Pause") : zh ? "播放" : "Play"}
        </LabButton>
        <LabButton
          onClick={() => {
            setPlaying(false);
            setIndex(0);
          }}
        >
          {zh ? "重置" : "Reset"}
        </LabButton>
        <output className="text-xs text-[var(--text-secondary)]">
          {index}/{parts.length}
        </output>
      </LabToolbar>
    </div>
  );
}
